<?php
/**
 * Block Name: Single Post Template.
 *
 * @package wp-curate
 */

/**
 * Registers the wp-curate/single-post-template block.
 */
function wp_curate_single_post_template_block_init(): void {
	register_block_type( __DIR__ );
}
add_action( 'init', 'wp_curate_single_post_template_block_init' );
