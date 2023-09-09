<?php
/**
 * Pinned_Post_Queries class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

use Alley\WP\Post_Queries\Exclude_Queries;
use Alley\WP\Post_Query\Post_IDs_Query;
use Alley\WP\Types\Post_IDs;
use Alley\WP\Types\Post_Queries;
use Alley\WP\Types\Post_Query;

/**
 * Prepend post IDs to query results.
 *
 * The pinned posts are pinned to all queries, so this class is not safe to use with paginated queries.
 */
final class Pinned_Post_Queries implements Post_Queries {
	/**
	 * Set up.
	 *
	 * @param Post_IDs     $pinned           Pinned post IDs.
	 * @param int          $default_per_page Default posts per page if not specified in args.
	 * @param Post_Queries $origin           Post_Queries object.
	 */
	public function __construct(
		private readonly Post_IDs $pinned,
		private readonly int $default_per_page,
		private readonly Post_Queries $origin,
	) {}

	/**
	 * Query for posts using literal arguments.
	 *
	 * @param array<string, mixed> $args Query arguments.
	 * @return Post_Query
	 */
	public function query( array $args ): Post_Query {
		$pinned_post_ids   = $this->pinned->post_ids();
		$expected_per_page = $this->default_per_page;

		if ( isset( $args['posts_per_page'] ) && is_numeric( $args['posts_per_page'] ) ) {
			$expected_per_page = (int) $args['posts_per_page'];
		}

		if ( count( $pinned_post_ids ) >= $expected_per_page ) {
			$per_page_post_ids = \array_slice( $pinned_post_ids, 0, $expected_per_page );

			return new Post_IDs_Query( $per_page_post_ids );
		}

		$args['posts_per_page'] = $expected_per_page - \count( $pinned_post_ids );

		$remaining       = new Exclude_Queries(
			$this->pinned,
			$args['posts_per_page'],
			$this->origin,
		);
		$remaining_query = $remaining->query( $args );

		return new Post_IDs_Query( array_merge( $pinned_post_ids, $remaining_query->post_ids() ) );
	}
}
