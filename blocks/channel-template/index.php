<?php
/**
 * Block Name: Channel Template.
 *
 * @package wp-curate
 */

/**
 * Registers the wp-curate/channel-template block.
 */
function wp_curate_channel_template_block_init(): void {
	register_block_type(
		__DIR__,
		[
			// `render.php` renders the inner blocks itself, once for each post.
			'skip_inner_blocks' => true,
		],
	);
}
add_action( 'init', 'wp_curate_channel_template_block_init' );
