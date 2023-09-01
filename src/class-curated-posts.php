<?php
/**
 * Curated_Posts class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

use Alley\WP\Types\Post_Queries;
use WP_Block_Type;

/**
 * The posts that match block attributes.
 */
final class Curated_Posts {
	/**
	 * Set up.
	 *
	 * @param Post_Queries $queries Available queries.
	 */
	public function __construct(
		private readonly Post_Queries $queries,
	) {}

	/**
	 * Update 'wp-curate/query' block 'query' context so that 'core/post-template' blocks query for the curated posts.
	 *
	 * @param array         $context    Query block context.
	 * @param array         $attributes Block attributes.
	 * @param WP_Block_Type $block_type Block type.
	 * @return array Updated context.
	 */
	public function as_query_context( array $context, array $attributes, WP_Block_Type $block_type ): array {
		$query            = [];
		$query['include'] = [];
		$query['perPage'] = $attributes['numberOfPosts'] ?? $block_type->attributes['numberOfPosts']['default'];

		$pinned_posts = $attributes['posts'] ?? $block_type->attributes['posts']['default'];
		$pinned_posts = is_array( $pinned_posts ) ? array_filter( $pinned_posts, fn ( $p ) => is_numeric( $p ) && $p > 0 ) : [];

		if ( count( $pinned_posts ) > 0 ) {
			array_push( $query['include'], ...$pinned_posts );
		}

		if ( count( $query['include'] ) < $query['perPage'] ) {
			$remaining_args = [
				'fields'              => 'ids',
				'ignore_sticky_posts' => true,
				'no_found_rows'       => true,
				'order'               => 'DESC',
				'orderby'             => 'date',
				'posts_per_page'      => $query['perPage'],
				'post_status'         => 'publish',
			];

			$remaining_args['post_type'] = $attributes['postTypes'] ?? $block_type->attributes['postTypes']['default'];
			$remaining_args['offset']    = $attributes['offset'] ?? $block_type->attributes['offset']['default'];

			if ( isset( $attributes['terms'] ) && is_array( $attributes['terms'] ) && count( $attributes['terms'] ) > 0 ) {
				$remaining_args['tax_query'] = [
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

			if (
				isset( $attributes['searchTerm'] )
				&& is_string( $attributes['searchTerm'] )
				&& strlen( $attributes['searchTerm'] ) > 0
			) {
				$remaining_args['s'] = $attributes['searchTerm'];
			} elseif (
				isset( $block_type->attributes['searchTerm']['default'] )
				&& is_string( $block_type->attributes['searchTerm']['default'] )
				&& strlen( $block_type->attributes['searchTerm']['default'] ) > 0
			) {
				$remaining_args['s'] = $block_type->attributes['searchTerm']['default'];
			}

			$remaining_post_ids = $this->queries->post_query_for_args( $remaining_args )->post_ids();

			if ( count( $remaining_post_ids ) > 0 ) {
				array_push(
					$query['include'],
					...array_diff( $remaining_post_ids, $query['include'] ),
				);
			}
		}

		if ( count( $query['include'] ) > 0 ) {
			$query['include'] = array_slice( $query['include'], 0, $query['perPage'] );
			$query['orderby'] = 'post__in';
		} else {
			$query['search'] = '1331a630-ad7f-41c9-aa04-a3eab1f8011a'; // Bogus search term to stop the query.
		}

		$context['query'] = $query;

		return $context;
	}
}
