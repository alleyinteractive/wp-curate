<?php
/**
 * Block Name: Post.
 *
 * @package wp-curate
 */

use Alley\WP\WP_Curate\Supported_Post_Types;

/**
 * Registers the wp-curate/post block using the metadata loaded from the `block.json` file.
 */
function wp_curate_post_block_init(): void {
	$supported_post_types = new Supported_Post_Types();
	if ( ! in_array( $supported_post_types->get_current_post_type(), $supported_post_types->get_supported_post_types(), true ) ) {
		return;
	}

	// Register the block by passing the location of block.json.
	register_block_type(
		__DIR__
	);
}
add_action( 'init', 'wp_curate_post_block_init' );
