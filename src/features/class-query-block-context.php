<?php
/**
 * Query_Block_Context class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\Validator\Comparison;
use Alley\WP\Deduplicated_Post_Queries;
use Alley\WP\Types\Feature;
use Alley\WP\Types\Post_Queries;
use Alley\WP\Types\Post_Query;
use Alley\WP\Used_Post_IDs;
use Alley\WP\Variable_Post_Queries;
use Alley\WP\WP_Curate\Curated_Posts;
use WP_Block_Type_Registry;

/**
 * Provides context to query blocks
 */
final class Query_Block_Context implements Feature {
	/**
	 * Set up.
	 *
	 * @param Post_Queries           $default_post_queries The post queries available to all query blocks by default.
	 * @param Used_Post_IDs          $used_post_ids        The post IDs that have already been used in this request.
	 * @param Post_Query             $main_query           The main query.
	 * @param int                    $default_per_page     The default number of posts per page.
	 * @param string                 $stop_queries_var     The query var to stop queries.
	 * @param WP_Block_Type_Registry $block_type_registry  Core block type registry.
	 */
	public function __construct(
		private readonly Post_Queries $default_post_queries,
		private readonly Used_Post_IDs $used_post_ids,
		private readonly Post_Query $main_query,
		private readonly int $default_per_page,
		private readonly string $stop_queries_var,
		private readonly WP_Block_Type_Registry $block_type_registry,
	) {}

	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_filter( 'render_block_context', [ $this, 'filter_query_context' ], 10, 2 );
	}

	/**
	 * Filters the context provided to a 'wp-curate/query' block.
	 *
	 * @param array $context      Default context.
	 * @param array $parsed_block Block being rendered.
	 * @return array Updated context.
	 */
	public function filter_query_context( $context, $parsed_block ) {
		$block_type = $this->block_type_registry->get_registered( 'wp-curate/query' );

		if (
			! $block_type instanceof \WP_Block_Type
			|| ! isset( $parsed_block['blockName'] )
			|| $block_type->name !== $parsed_block['blockName']
		) {
			return $context;
		}

		$post_queries = $this->default_post_queries;

		// Use deduplicated queries if deduplication is enabled for this post and this block instance.
		$post_queries = new Variable_Post_Queries(
			input: function () use ( $parsed_block ) {
				$main_query = $this->main_query->query_object();

				if ( isset( $parsed_block['attrs']['deduplication'] ) && 'never' === $parsed_block['attrs']['deduplication'] ) {
					return false;
				}

				if ( true === $main_query->is_singular() || true === $main_query->is_posts_page ) {
					$post_level_deduplication = get_post_meta( $main_query->get_queried_object_id(), 'wp_curate_deduplication', true );

					if ( true === (bool) $post_level_deduplication ) {
						return true;
					}
				}

				return false;
			},
			test: new Comparison( [ 'compared' => true ] ),
			is_true: new Deduplicated_Post_Queries(
				used_post_ids: $this->used_post_ids,
				posts_per_page: $this->default_per_page,
				origin: $post_queries,
			),
			is_false: $post_queries,
		);

		$curated_posts = new Curated_Posts( backfill: $post_queries );
		$post_ids      = $curated_posts->curated_block_query( $parsed_block['attrs'], $block_type )->post_ids();

		// Record the post IDs included in this block for future deduplication.
		$this->used_post_ids->record( $post_ids );

		// Update context with the post IDs, or nullify the query.
		if ( count( $post_ids ) > 0 ) {
			$context['query']['include'] = $post_ids;
			$context['query']['orderby'] = 'post__in';
			$context['query']['perPage'] = $parsed_block['attrs']['numberOfPosts'] ?? $block_type->attributes['numberOfPosts']['default'];
		} else {
			$context['query'][ $this->stop_queries_var ] = true;
		}

		return $context;
	}
}
