<?php
/**
 * Core_Query_Block_Integration class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;
use WP_Block;

final class Test_Custom_Post_Type implements Feature {
	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_action( 'init', [ $this, 'register_custom_post_type' ] );
		add_filter( 'wp_curate_allowed_post_types', [ $this, 'allowed_post_types' ] );
	}

	public function allowed_post_types( array $allowed_post_types ): array {
		$allowed_post_types[] = 'book';
		return $allowed_post_types;
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
	public function register_custom_post_type( ): void {
		$args = array(
			'public'    => true,
			'label'     => __( 'Books', 'wp-curate' ),
			'menu_icon' => 'dashicons-book',
			'show_in_rest'          => true,
			'supports'           => array( 'title', 'editor', 'author', 'thumbnail' ),
		);
		register_post_type( 'book', $args );
	}
}
