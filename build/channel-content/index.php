<?php
/**
 * Block Name: Channel Content.
 *
 * @package wp-curate
 */

/**
 * Registers the wp-curate/channel-content block.
 */
function wp_curate_channel_content_block_init(): void {
	register_block_type(
		__DIR__,
		[
			// `render.php` renders the inner blocks itself, to count the posts that they show.
			'skip_inner_blocks' => true,
		],
	);
}
add_action( 'init', 'wp_curate_channel_content_block_init' );
