<?php

namespace Alley\WP\WP_Curate;

use Alley\WP\Post_Query\Post_IDs_Query;
use Alley\WP\Types\Post_Queries;
use Alley\WP\Types\Post_Query;

use WP_Block_Type;

use function Alley\WP\match_blocks;

final class Precompiled_Post_Queries implements Post_Queries {
	private $trk;

	private $com;

	public function __construct(
		private readonly Post_Query $main_query,
		private readonly Curated_Posts $curated_posts,
		private readonly Post_Queries $origin,
	) {}

	/**
	 * Query for posts using literal arguments.
	 *
	 * @param array<string, mixed> $args Query arguments.
	 * @return Post_Query
	 */
	public function query( array $args ): Post_Query {
		if ( ! $this->trk ) {
			$this->compile();
		}

		if ( $this->trk ) {
			$fwd = $this->trk->fwd( $args, $this->origin );
			return new Post_IDs_Query( array_slice( $fwd->post_ids(), 0, $args['posts_per_page'] ) );
		}

		return $this->origin->query( $args );
	}

	private function compile() {
		$q = $this->main_query->query_object();

		if ( ! ( true === $q->is_singular() || true === $q->is_posts_page ) ) {
			return;
		}

		$blocks = match_blocks(
			$q->get_queried_object(),
			[
				'name' => 'wp-curate/query',
			],
		);

		$this->trk = new class() implements Post_Queries {
			private $col = [];

			private $tot = 0;

			private $cah = [];

			// happens whether deduping is on or not, but if deduping is off, we need to know only the max posts out of all identical queries
			// overfetch if there is an identical query and deduping is enabled, where overfetch = ppp of all queries
			// behavior of the decorator is to determine whether to overfetch and if so increase the ppp of the query and cache it
			public function query( array $args ): Post_Query {
				$per_page = $args['posts_per_page'] ?? get_option( 'posts_per_page' );
				if ( empty( $args['offset'] ) ) {
					unset( $args['posts_per_page'] );
					$hsh = md5( json_encode( $args ) );
					$this->col[$hsh] ??= [ 0, 0, $args ];
					$this->col[$hsh][0] += 1;
					$this->col[$hsh][1] += $per_page;
				}
				$this->tot += $per_page;

				return new Post_IDs_Query( [] );
			}

			public function fwd( array $args, Post_Queries $origin ): Post_Query {
				$per = $args['posts_per_page'];
				unset( $args['posts_per_page'] );
				$hsh = md5( json_encode( $args ) );

				if ( isset( $this->col[ $hsh ] ) && $this->col[ $hsh ][0] > 1 ) {
					$per = $this->tot;
				}

				$args['posts_per_page'] = $per;

				return isset( $this->col[ $hsh ] ) ? $this->cah[ $hsh ] ??= $origin->query( $args ) : $origin->query( $args );
			}
		};

		$cur = new Plugin_Curated_Posts( $this->trk );

		foreach ( $blocks as $block ) {
			$cur->with_query_context( [], $block['attrs'], \WP_Block_Type_Registry::get_instance()->get_registered( 'wp-curate/query' ) );
		}
	}
}
