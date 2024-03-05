<?php
/**
 * Trending_Post_Queries class file
 *
 * @package wp-type-extensions
 */

namespace Alley\WP\WP_Curate;

use Alley\WP\Types\Post_Queries;
use Alley\WP\Types\Post_Query;
use Alley\WP\Post_Query\WP_Query_Envelope;
use Alley\WP\WP_Curate\Features\Parsely_Support;

/**
 * Pull trending posts from Parsely.
 */
final class Trending_Post_Queries implements Post_Queries {
	/**
	 * Set up.
	 *
	 * @param Post_Queries $origin Post_Queries object.
	 */
	public function __construct(
		private readonly Post_Queries $origin,
	) {}

	/**
	 * Query for posts using literal arguments.
	 *
	 * @param array<string, mixed> $args The arguments to be used in the query.
	 * @return Post_Query
	 */
	public function query( array $args ): Post_Query {
		if ( 'trending' === $args['orderby'] ) {
			$parsely  = new Parsely_Support();
			$trending = $parsely->get_trending_posts( $args );
			if ( ! empty( $trending ) ) {
				return new WP_Query_Envelope(
					new \WP_Query(
						[
							'post__in'            => $trending,
							'post_type'           => 'any',
							'ignore_sticky_posts' => true,
							'orderby'             => 'post__in',
						]
					)
				);
			}
		}

		return $this->origin->query( $args );
	}
}
