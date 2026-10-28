<?php
/**
 * Block Name: Channel.
 *
 * @package wp-curate
 */

/**
 * Registers the wp-curate/channel block.
 */
function wp_curate_channel_block_init(): void {
	register_block_type( __DIR__ );
}
add_action( 'init', 'wp_curate_channel_block_init' );
