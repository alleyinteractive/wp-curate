<?php
/**
 * Slotfills script registration and enqueue.
 *
 * This file will be copied to the assets build directory.
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

/**
 * Registers all slotfill assets so that they can be enqueued through Gutenberg in
 * the corresponding context.
 */
function register_slotfills_scripts(): void {
	/**
	 * Filter the post types that will show the "Enable Deduplication" slotfill.
	 *
	 * @param array $allowed_post_types The post types that will show the "Enable Deduplication" slotfill.
	 */
	$allowed_post_types = apply_filters( 'wp_curate_duduplication_slotfill_post_types', [ 'page', 'post' ] );

	$supported_post_types = new Supported_Post_Types();
	if ( ! $supported_post_types->should_register_block() ) {
		return;
	}

	// Automatically load dependencies and version.
	$asset_file = include __DIR__ . '/index.asset.php';

	wp_register_script(
		'wp-curate_slotfills',
		plugins_url( 'index.js', __FILE__ ),
		$asset_file['dependencies'],
		$asset_file['version'],
		true
	);

	wp_set_script_translations( 'wp-curate_slotfills', 'wp-curate' );
}
add_action( 'init', __NAMESPACE__ . '\register_slotfills_scripts' );

/**
 * Enqueue block editor assets for this slotfill.
 */
function action_enqueue_slotfills_assets(): void {
	wp_enqueue_script( 'wp-curate_slotfills' );
}
add_action(
	'enqueue_block_editor_assets',
	__NAMESPACE__ . '\action_enqueue_slotfills_assets'
);
