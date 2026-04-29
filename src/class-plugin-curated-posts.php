<?php
/**
 * Curated_Posts class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

use Alley\WP\Types\Post_Queries;
use WP_Block_Type;

use function Mantle\Support\Helpers\data_get;
use function Mantle\Support\Helpers\mixed;

/**
 * The posts that match 'wp-curate/query' block attributes.
 */
final class Plugin_Curated_Posts implements Curated_Posts {
	/**
	 * Default number of days to limit backfill posts. Mirrored in block.json and edit.tsx.
	 */
	const DEFAULT_BACKFILL_DAYS = 30;

	/**
	 * Set up.
	 *
	 * @param Post_Queries $queries Available queries.
	 */
	public function __construct(
		private readonly Post_Queries $queries,
	) {}

	/**
	 * Populate query block context from curation fields.
	 *
	 * @param array<string, mixed> $context    Query block context.
	 * @param array<string, mixed> $attributes Curation field settings.
	 * @param WP_Block_Type        $block_type Block type.
	 * @return array{"query": array<string, mixed>} Updated context.
	 */
	public function with_query_context( array $context, array $attributes, WP_Block_Type $block_type ): array {
		if ( ! is_array( $block_type->attributes ) ) {
			$context['query'] = [];

			return $context;
		}

		$args = [
			'fields'         => 'ids',
			'no_found_rows'  => true,
			'offset'         => mixed( $attributes['offset'] ?? data_get( $block_type->attributes, 'offset.default', 0 ) )->int(),
			'order'          => $attributes['order'] ?? 'DESC',
			'orderby'        => $attributes['orderby'] ?? 'date',
			'meta_key'       => $attributes['metaKey'] ?? '',
			'posts_per_page' => mixed( $attributes['numberOfPosts'] ?? data_get( $block_type->attributes, 'numberOfPosts.default', 0 ) )->int(),
			'post_status'    => 'publish',
			'post_type'      => $attributes['postTypes'] ?? data_get( $block_type->attributes, 'postTypes.default', [] ),
		];

		if ( isset( $attributes['terms'] ) && is_array( $attributes['terms'] ) && count( $attributes['terms'] ) > 0 ) {
			$args['tax_query'] = [ // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
				'relation' => $attributes['taxRelation'] ?? 'AND',
			];

			foreach ( $attributes['terms'] as $taxonomy => $terms ) {
				if ( taxonomy_exists( $taxonomy ) && is_array( $terms ) && count( $terms ) > 0 ) {
					$operator            = isset( $attributes['termRelations'] ) && is_array( $attributes['termRelations'] ) ? $attributes['termRelations'][ $taxonomy ] ?? 'OR' : 'OR';
					$args['tax_query'][] = [
						'taxonomy' => $taxonomy,
						'terms'    => array_column( $terms, 'id' ),
						// Note: Tax_query wants 'AND' or 'IN' for operator. The REST API wants 'AND' or 'OR'.
						'operator' => 'OR' === $operator ? 'IN' : $operator,
					];
				}
			}
		}

		$search_term = $attributes['searchTerm'] ?? data_get( $block_type->attributes, 'searchTerm.default', '' );

		if ( is_string( $search_term ) && strlen( $search_term ) > 0 ) {
			$args['s'] = $search_term;
		}

		/**
		 * Filters the number of days to limit backfill posts to.
		 * Return 0 to disable the date limit. The filter receives the per-block value
		 * so site-wide overrides can ignore it.
		 *
		 * @param int $backfill_days Days to limit backfill posts. 0 means no limit.
		 */
		$backfill_days = (int) apply_filters( 'wp_curate_backfill_days', (int) ( $attributes['backfillDays'] ?? self::DEFAULT_BACKFILL_DAYS ) );
		if ( $backfill_days > 0 ) {
			$args['date_query'] = [ // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_date_query
				[
					'after'     => gmdate( 'Y-m-d', (int) strtotime( "-{$backfill_days} days" ) ),
					'inclusive' => true,
				],
			];
		}

		$pinned_posts = $attributes['posts'] ?? data_get( $block_type->attributes, 'posts.default', [] );
		$pinned_posts = array_map(
			fn ( $id ) => is_numeric( $id ) && 'publish' === get_post_status( (int) $id ) ? (int) $id : null,
			is_array( $pinned_posts ) ? $pinned_posts : [],
		);

		$queries = new Positioned_Post_Queries(
			positioned: $pinned_posts,
			default_per_page: $args['posts_per_page'],
			origin: $this->queries,
		);

		/**
		 * Filters the arguments used when querying for posts that match the block attributes.
		 *
		 * @param array<string, mixed> $args Query arguments.
		 */
		$args = apply_filters( 'wp_curate_plugin_curated_post_query', $args );

		$context['query'] = [
			'perPage'  => $args['posts_per_page'],
			'include'  => $queries->query( $args )->post_ids(),
			'orderby'  => 'post__in',
			'postType' => $args['post_type'],
		];

		return $context;
	}
}
