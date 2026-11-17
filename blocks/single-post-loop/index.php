<?php
/**
 * Block Name: Single Post Loop.
 *
 * @package wp-curate
 */

/**
 * Registers the wp-curate/single-post-loop block.
 */
function wp_curate_single_post_loop_block_init(): void {
	register_block_type( __DIR__ );
}
add_action( 'init', 'wp_curate_single_post_loop_block_init' );
