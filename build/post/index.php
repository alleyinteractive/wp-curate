<?php
/**
 * Block Name: Post.
 *
 * @package wp-curate
 */

/**
 * Registers the wp-curate/post block using the metadata loaded from the `block.json` file.
 */
function wp_curate_post_block_init(): void {
	// Register the block by passing the location of block.json.
	register_block_type(
		__DIR__
	);
}
add_action( 'init', 'wp_curate_post_block_init' );
