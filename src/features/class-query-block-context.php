<?php
/**
 * Query_Block_Context class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\Validator\Comparison;
use Alley\WP\Blocks\Parsed_Block;
use Alley\WP\Post_IDs\Post_IDs_Envelope;
use Alley\WP\Post_Queries\Exclude_Queries;
use Alley\WP\Post_Queries\Variable_Post_Queries;
use Alley\WP\Types\Feature;
use Alley\WP\Types\Post_Queries;
use Alley\WP\Types\Post_Query;
use Alley\WP\WP_Curate\Must_Include_Curated_Posts;
use Alley\WP\WP_Curate\Plugin_Curated_Posts;
use Alley\WP\WP_Curate\Post_IDs\History;
use Alley\WP\WP_Curate\Recorded_Curated_Posts;
use Alley\WP\WP_Curate\Trending_Post_Queries;
use WP_Block;
use WP_Block_Type;
use WP_Block_Type_Registry;

/**
 * Provides context to query blocks
 */
final class Query_Block_Context implements Feature {

	/**
	 * Custom post titles associated with Query.
	 *
	 * @var array<array{'postId': int, 'title': string}>
	 */
	private array $custom_post_titles = [];

	/**
	 * Set up.
	 *
	 * @param Post_Queries           $post_queries        The post queries available to all query blocks by default.
	 * @param History                $history             The post IDs that have already been used in this request.
	 * @param Post_Query             $main_query          The main query.
	 * @param int                    $default_per_page    Default posts per page.
	 * @param string                 $stop_queries_var    The query var to stop queries.
	 * @param WP_Block_Type_Registry $block_type_registry Core block type registry.
	 */
	public function __construct(
		private readonly Post_Queries $post_queries,
		private readonly History $history,
		private readonly Post_Query $main_query,
		private readonly int $default_per_page,
		private readonly string $stop_queries_var,
		private readonly WP_Block_Type_Registry $block_type_registry,
	) {}

	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		// Sets up WordPress hook to modify context of 'query' blocks.
		add_filter( 'render_block_context', [ $this, 'filter_query_context' ], 10, 3 );
	}

	/**
	 * Filters the context provided to a query block to determine the definitive list of backfilled posts.
	 *
	 * @param array<string, mixed>                 $context Default context.
	 * @param array{"attrs": array<string, mixed>} $parsed_block Block being rendered.
	 * @param WP_Block|null                        $parent_block Parent block, if any.
	 * @return array<string, mixed> Updated context.
	 */
	public function filter_query_context( $context, $parsed_block, $parent_block ): array {
		$current_block              = new Parsed_Block( $parsed_block );
		$current_block_type         = $this->block_type_registry->get_registered( (string) $current_block->block_name() );
		$plugin_query_block_type    = $this->block_type_registry->get_registered( 'wp-curate/query' );
		$plugin_subquery_block_type = $this->block_type_registry->get_registered( 'wp-curate/subquery' );

		// If the block type is a custom 'query' block from our plugin, provide 'query' context.
		if (
			( $plugin_query_block_type instanceof WP_Block_Type && $current_block->block_name() === $plugin_query_block_type->name )
			|| ( $plugin_subquery_block_type instanceof WP_Block_Type && $current_block->block_name() === $plugin_subquery_block_type->name )
		) {
			// Handles the decision to exclude (deduplicate) posts or not, based on a given input.
			$variable_post_queries = new Variable_Post_Queries(
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
				// Exclude posts that have already been used in this request.
				test: new Comparison( [ 'compared' => true ] ),
				is_true: new Exclude_Queries(
					$this->history,
					$this->default_per_page,
					$this->post_queries,
				),
				is_false: $this->post_queries,
			);

			// Exclude the current post from the list of posts to backfill.
			$exclude_current_post_queries = new Variable_Post_Queries(
				input: function () {
					return $this->main_query->query_object()->is_singular();
				},
				test: new Comparison( [ 'compared' => true ] ),
				is_true: new Exclude_Queries(
					new Post_IDs_Envelope( [ $this->main_query->query_object()->get_queried_object_id() ] ),
					$this->default_per_page,
					$variable_post_queries,
				),
				is_false: $variable_post_queries,
			);

			// Pull trending posts from Parsely and merge with existing queries.
			$plugin_curated_posts = new Plugin_Curated_Posts(
				queries: new Trending_Post_Queries(
					origin: $exclude_current_post_queries,
					parsely: new Parsely_Support(),
				),
			);

			// Handle deduplication and backfilling of curated posts.
			$curated_posts = new Recorded_Curated_Posts(
				history: $this->history,
				origin: new Must_Include_Curated_Posts(
					qv: $this->stop_queries_var,
					origin: $plugin_curated_posts,
				),
			);

			// Pass updated context to the block.
			$context = $curated_posts->with_query_context( $context, $parsed_block['attrs'], $current_block_type );
		}

		/*
		 * Ensure that immediate children of our plugin's query block are provided the customized 'query'
		 * context. This is necessary because of a quirk in how the 'render_block_context' filter is
		 * applied to inner blocks: When context is added to the query block via the filter, it
		 * isn't passed to its inner blocks, unlike context added to a top-level query block.
		 */
		if (
			$parent_block instanceof WP_Block
			&& $current_block_type instanceof WP_Block_Type
			&& (
				( $plugin_query_block_type instanceof WP_Block_Type && $parent_block->name === $plugin_query_block_type->name )
				|| ( $plugin_subquery_block_type instanceof WP_Block_Type && $parent_block->name === $plugin_subquery_block_type->name )
			)
			&& in_array( 'query', $current_block_type->uses_context, true ) // @phpstan-ignore-line - uses_context is private in WP_Block_Type but can be accessed via a magic method.
			&& isset( $parent_block->context['query'] )
			&& ! isset( $context['query'] )
		) {
			$context['query'] = $parent_block->context['query'];
		}

		/**
		 * In addition to having access to the query context for the said reason above, also
		 * ensure that the `wp-curate/post-title` block has access to custom post titles
		 * in it's context.
		 *
		 * This is necessary due to filtering that happens in core which forces only post ID and
		 * post type to be available.
		 *
		 * See: https://github.com/WordPress/gutenberg/blob/trunk/packages/block-library/src/post-template/index.php#L113
		 */
		if (
			$parent_block instanceof WP_Block
			&& $current_block_type instanceof WP_Block_Type
			&& in_array( 'query', $current_block_type->uses_context, true ) // @phpstan-ignore-line - uses_context is private in WP_Block_Type but can be accessed via a magic method.
			&& $current_block->block_name() === 'core/post-template'
			&& 'wp-curate/query' === $parent_block->name
			&& isset( $parent_block->attributes['customPostTitles'] )
		) {
			$this->custom_post_titles = $parent_block->attributes['customPostTitles'];
		}

		// Manually assign custom post titles to 'wp-curate/post-title' context.
		if ( $current_block->block_name() === 'wp-curate/post-title' && ! empty( $this->custom_post_titles ) ) {
			$context['customPostTitles'] = $this->custom_post_titles;
		}

		return $context;
	}
}
