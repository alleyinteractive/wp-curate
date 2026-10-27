<?php
/**
 * Block Name: Many Posts.
 *
 * @package wp-curate
 */

/**
 * Registers the wp-curate/many-posts block.
 */
function wp_curate_many_posts_block_init(): void {
	register_block_type( __DIR__ );
}
add_action( 'init', 'wp_curate_many_posts_block_init' );
