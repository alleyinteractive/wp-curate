<?php
/**
 * Core_Query_Block_Integration class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;
use WP_Block;

use function Alley\traverse;

/**
 * Integrate with the 'core/query' block.
 */
final class Core_Query_Block_Integration implements Feature {
	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_filter( 'query_loop_block_query_vars', [ $this, 'filter_query_vars' ], 10, 2 );
	}

	/**
	 * Filters the arguments which will be passed to `WP_Query` for the Query Loop Block.
	 *
	 * Anything to this filter should be compatible with the `WP_Query` API to form
	 * the query context which will be passed down to the Query Loop Block's children.
	 *
	 * Please note that this will only influence the query that will be rendered on the
	 * front-end. The editor preview is not affected by this filter.
	 *
	 * @param array<string, mixed> $query Array containing parameters for `WP_Query` as parsed by the block context.
	 * @param WP_Block             $block Block instance.
	 * @return array<string, mixed> Updated query arguments.
	 */
	public function filter_query_vars( $query, $block ): array {
		[ $found_rows, $include, $orderby, $post_type ] = (array) traverse(
			$block,
			[
				'context.query.foundRows',
				'context.query.include',
				'context.query.orderby',
				'context.query.postType',
			],
		);

		// Make all query blocks 'no_found_rows => true' unless attributes include '"foundRows": true'
		// or the block contains a pagination block (which requires found rows to calculate page count).
		if ( true !== $found_rows && ! $this->has_query_pagination( $block ) ) {
			$query['no_found_rows'] = true;
		}

		// Support arrays of post types.
		if ( is_array( $post_type ) ) {
			$query['post_type'] = array_filter( $post_type, 'is_post_type_viewable' ); // @phpstan-ignore-line argument.type
		}

		if ( is_array( $include ) ) {
			$query['post__in'] = array_map( 'intval', $include ); // @phpstan-ignore-line argument.type
		}

		if ( is_string( $orderby ) ) {
			$query['orderby'] = $orderby;
		}

		// Make all query blocks ignore sticky posts by default.
		$query['ignore_sticky_posts'] ??= true;

		return $query;
	}

	/**
	 * Checks whether a block contains a 'core/query-pagination' inner block at any depth.
	 *
	 * @param WP_Block $block Block instance.
	 * @return bool
	 */
	private function has_query_pagination( WP_Block $block ): bool {
		foreach ( $block->inner_blocks as $inner ) {
			if ( 'core/query-pagination' === $inner->name || $this->has_query_pagination( $inner ) ) {
				return true;
			}
		}

		return false;
	}
}
