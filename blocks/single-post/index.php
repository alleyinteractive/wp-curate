<?php
/**
 * Block Name: Single Post.
 *
 * @package wp-curate
 */

/**
 * Registers the wp-curate/single-post block.
 */
function wp_curate_single_post_block_init(): void {
	register_block_type(
		__DIR__,
		[
			// `render.php` renders the inner blocks itself, with the post as context.
			'skip_inner_blocks' => true,
		],
	);
}
add_action( 'init', 'wp_curate_single_post_block_init' );
