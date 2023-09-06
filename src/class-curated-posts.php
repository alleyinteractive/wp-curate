<?php
/**
 * Curated_Posts class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

use Alley\WP\Post_IDs_Query;
use Alley\WP\Posts\Excluded_Queries;
use Alley\WP\Posts\Recorded_Queries;
use Alley\WP\Types\Post_IDs;
use Alley\WP\Types\Post_Queries;
use Alley\WP\Types\Post_Query;
use Alley\WP\Used_Post_IDs;
use WP_Block_Type;

/**
 * The posts that match block attributes.
 */
final class Curated_Posts {
	/**
	 * Set up.
	 *
	 * @param Post_Queries $backfill Queries to use when backfilling posts.
	 */
	public function __construct(
		private readonly Post_Queries $backfill,
		private readonly Used_Post_IDs $track,
	) {}

	/**
	 * Query for posts using block attributes.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @param WP_Block_Type        $block_type Block type.
	 * @return Post_Query
	 */
	public function curated_block_query( array $attributes, WP_Block_Type $block_type ): Post_Query {
		if ( ! is_array( $block_type->attributes ) ) {
			return new Post_IDs_Query( [] );
		}

		$include  = [];
		$per_page = $attributes['numberOfPosts'] ?? $block_type->attributes['numberOfPosts']['default'];

		$pinned_posts = $attributes['posts'] ?? $block_type->attributes['posts']['default'];
		$pinned_posts = is_array( $pinned_posts ) ? array_filter( $pinned_posts, fn ( $p ) => is_numeric( $p ) && $p > 0 ) : [];

		if ( count( $pinned_posts ) > 0 ) {
			array_push( $include, ...$pinned_posts );
		}

		if ( $per_page > count( $include ) ) {
			$remaining_args = [
				'fields'              => 'ids',
				'ignore_sticky_posts' => true,
				'no_found_rows'       => true,
				'order'               => 'DESC',
				'orderby'             => 'date',
				'posts_per_page'      => $per_page - count( $include ),
				'post_status'         => 'publish',
			];

			$remaining_args['post_type'] = $attributes['postTypes'] ?? $block_type->attributes['postTypes']['default'];
			$remaining_args['offset']    = $attributes['offset'] ?? $block_type->attributes['offset']['default'];

			if ( isset( $attributes['terms'] ) && is_array( $attributes['terms'] ) && count( $attributes['terms'] ) > 0 ) {
				$remaining_args['tax_query'] = [ // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
					'relation' => 'AND',
				];

				foreach ( $attributes['terms'] as $taxonomy => $terms ) {
					if ( taxonomy_exists( $taxonomy ) && is_array( $terms ) && count( $terms ) > 0 ) {
						$remaining_args['tax_query'][] = [
							'taxonomy' => $taxonomy,
							'terms'    => array_column( $terms, 'id' ),
						];
					}
				}
			}

			$search_term = $attributes['searchTerm'] ?? $block_type->attributes['searchTerm']['default'];

			if ( is_string( $search_term ) && strlen( $search_term ) > 0 ) {
				$remaining_args['s'] = $search_term;
			}

			$backfill          = new Excluded_Queries( new class( $include ) implements Post_IDs {
				public function __construct(
					private readonly array $exclude,
				) {}

				public function post_ids(): array {
					return $this->exclude;
				}
			}, $per_page, $this->backfill );
			$backfill = new Recorded_Queries( $this->track, $backfill );
			$backfill_post_ids = $backfill->post_query_for_args( $remaining_args )->post_ids();

			if ( count( $backfill_post_ids ) > 0 ) {
				array_push(
					$include,
					...array_diff( $backfill_post_ids, $include ),
				);
			}
		}
		$this->track->record( $include );
		return new Post_IDs_Query( $include );
	}
}
