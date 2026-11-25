<?php
/**
 * Block Name: Channel Loop.
 *
 * @package wp-curate
 */

/**
 * Registers the wp-curate/channel-loop block.
 */
function wp_curate_channel_loop_block_init(): void {
	register_block_type(
		__DIR__,
		[
			// `render.php` renders the inner blocks itself, in a Single Post block for each post.
			'skip_inner_blocks' => true,
		],
	);
}
add_action( 'init', 'wp_curate_channel_loop_block_init' );
