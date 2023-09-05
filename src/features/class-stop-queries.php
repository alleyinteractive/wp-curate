<?php
/**
 * Stop_Queries class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;
use WP_Block;
use WP_Post;
use WP_Query;

/**
 * Look for a special query var that indicates a query should not run.
 */
final class Stop_Queries implements Feature {
	/**
	 * Set up.
	 *
	 * @param string $query_var Query variable to stop queries.
	 */
	public function __construct(
		private readonly string $query_var,
	) {}

	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_filter( 'query_loop_block_query_vars', [ $this, 'filter_query_loop_block_query_vars' ], 10, 2 );
		add_filter( 'posts_pre_query', [ $this, 'filter_posts_pre_query' ], 10, 2 );
		// For compatibility with Advanced Post Cache, which uses this older hook.
		add_filter( 'posts_results', [ $this, 'filter_posts_pre_query' ], 10, 2 );
	}

	/**
	 * Filters the arguments which will be passed to `WP_Query` for the Query Loop Block.
	 *
	 * @param array    $query Array containing parameters for `WP_Query` as parsed by the block context.
	 * @param WP_Block $block Block instance.
	 * @return array Updated query arguments.
	 */
	public function filter_query_loop_block_query_vars( $query, $block ) {
		if ( isset( $block->context['query'][ $this->query_var ] ) ) {
			$query[ $this->query_var ] = $block->context['query'][ $this->query_var ];
		}

		return $query;
	}

	/**
	 * Filters the posts array before the query takes place.
	 *
	 * @param WP_Post[]|int[]|null $posts An array of post data or null.
	 * @param WP_Query             $query The WP_Query instance.
	 * @return  WP_Post[]|int[]|null Updated post data.
	 */
	public function filter_posts_pre_query( $posts, $query ) {
		if ( $query->get( $this->query_var, false ) === true ) {
			$posts                = [];
			$query->found_posts   = 0;
			$query->max_num_pages = 0;
		}

		return $posts;
	}
}
