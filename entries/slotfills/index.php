<?php
/**
 * Slotfills script registration and enqueue.
 *
 * This file will be copied to the assets build directory.
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

add_action(
	'enqueue_block_editor_assets',
	__NAMESPACE__ . '\action_enqueue_slotfills_assets'
);

/**
 * Registers all slotfill assets so that they can be enqueued through Gutenberg in
 * the corresponding context.
 */
function register_slotfills_scripts(): void {
	// Automatically load dependencies and version.
	$asset_file = include __DIR__ . '/index.asset.php';

	/**
	 * Filter the post types that will show the "Enable Deduplication" slotfill.
	 */
	$allowed_post_types = apply_filters( 'wp_curate_duduplication_slotfill_post_types', [ 'page', 'post' ] );

	$post_type = get_editor_post_type();

	if ( in_array( $post_type, $allowed_post_types, true ) ) {
		wp_register_script(
			'wp-curate_slotfills',
			plugins_url( 'index.js', __FILE__ ),
			$asset_file['dependencies'],
			$asset_file['version'],
			true
		);
		wp_set_script_translations( 'wp-curate_slotfills', 'wp-curate' );
	}
}
add_action( 'init', __NAMESPACE__ . '\register_slotfills_scripts' );

/**
 * Enqueue block editor assets for this slotfill.
 */
function action_enqueue_slotfills_assets(): void {
	wp_enqueue_script( 'wp-curate_slotfills' );
}

/**
 * Gets the post type currently being edited.
 *
 * @return string|false
 */
function get_editor_post_type() {
	// Set the default post type.
	$post_type = '';

	// Ensure we are in the admin before proceeding.
	if ( is_admin() ) {
		global $pagenow;

		// phpcs:ignore WordPress.VIP.SuperGlobalInputUsage.AccessDetected, WordPress.Security.NonceVerification.NoNonceVerification, WordPress.Security.NonceVerification.Recommended
		if ( 'post.php' === $pagenow && ! empty( $_GET['post'] ) ) {
			// phpcs:ignore WordPress.VIP.SuperGlobalInputUsage.AccessDetected, WordPress.Security.NonceVerification.Recommended
			$post_id   = absint( $_GET['post'] );
			$post_type = get_post_type( $post_id );
		// phpcs:ignore WordPress.VIP.SuperGlobalInputUsage.AccessDetected, WordPress.Security.NonceVerification.NoNonceVerification, WordPress.Security.NonceVerification.Recommended
		} elseif ( 'post-new.php' === $pagenow && ! empty( $_GET['post_type'] ) ) {
			// phpcs:ignore WordPress.VIP.SuperGlobalInputUsage.AccessDetected, WordPress.Security.NonceVerification.Recommended
			$post_type = sanitize_text_field( $_GET['post_type'] );
		}
	}
	return $post_type;
}
