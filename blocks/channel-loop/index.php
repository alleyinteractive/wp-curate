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
	register_block_type( __DIR__ );
}
add_action( 'init', 'wp_curate_channel_loop_block_init' );
