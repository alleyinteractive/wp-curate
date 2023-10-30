<?php
/**
 * Supported_Post_Types class file
 *
 * @package wp-curate
 */

declare(strict_types=1);

namespace Alley\WP\WP_Curate;

/**
 * The post types that should allow the Curation blocks and related meta.
 */
final class Supported_Post_Types {
	/**
	 * Stores the supported types.
	 *
	 * @var string[]
	 */
	private array $supported_post_types;

	/**
	 * Set up.
	 */
	public function __construct() {
		$this->initialize_supported_post_types();
	}

	/**
	 * Initialize the supported post types.
	 */
	public function initialize_supported_post_types(): void {
		// Get all post types.
		$post_types                 = get_post_types( [], 'objects' );
		$supported_post_types       = array_filter( $post_types, fn( $type ) => $type->public && use_block_editor_for_post_type( $type->name ) );
		$this->supported_post_types = array_keys( wp_list_pluck( $supported_post_types, 'name' ) );
		$this->register_post_meta();
	}

	/**
	 * Get the supported post types.
	 *
	 * @return string[]
	 */
	public function get_supported_post_types(): array {
		/**
		 * Filter the WP Curate supported post types.
		 *
		 * @param string[] $supported_post_types The supported post types.
		 */
		return apply_filters( 'wp_curate_supported_post_types', $this->supported_post_types );
	}

	/**
	 * Load in the supported post types.
	 *
	 * Load a block or slotfill using WP Curate supported post types, or custom ones.
	 *
	 * @param string[] $post_types The post types to load. Defaults to the supported post types.
	 * @return bool
	 */
	public function load( array $post_types = [] ): bool {
		$retval = true;

		if ( empty( $post_types ) ) {
			$post_types = $this->get_supported_post_types();
		}

		if ( ! in_array( $this->get_current_post_type(), $post_types, true ) ) {
			$retval = false;
		}

		/**
		 * Load WP Curate block or slotfill.
		 *
		 * @param bool $retval Whether or not to load the block.
		 * @param string[] $supported_post_types The supported post types.
		 */
		return apply_filters( 'wp_curate_load', $retval, $post_types );
	}

	/**
	 * Get the current post type.
	 *
	 * @global string $pagenow The filename of the current screen.
	 *
	 * @return string
	 */
	public function get_current_post_type(): string {
		$post_type = '';

		// Ensure we are in the admin before proceeding.
		if ( is_admin() ) {
			global $pagenow;

			// phpcs:ignore WordPress.VIP.SuperGlobalInputUsage.AccessDetected, WordPress.Security.NonceVerification.NoNonceVerification, WordPress.Security.NonceVerification.Recommended
			if ( 'post.php' === $pagenow && ! empty( $_GET['post'] ) ) {
				// phpcs:ignore WordPress.VIP.SuperGlobalInputUsage.AccessDetected, WordPress.Security.NonceVerification.Recommended
				$post_type = get_post_type( absint( $_GET['post'] ) );

				if ( ! $post_type ) {
					$post_type = '';
				}
			// phpcs:ignore WordPress.VIP.SuperGlobalInputUsage.AccessDetected, WordPress.Security.NonceVerification.NoNonceVerification, WordPress.Security.NonceVerification.Recommended
			} elseif ( 'post-new.php' === $pagenow ) {
				if ( ! empty( $_GET['post_type'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
					$post_type = sanitize_text_field( $_GET['post_type'] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
				} else {
					// Default to post.
					$post_type = 'post';
				}
			}
		}

		return $post_type;
	}

	/**
	 * Register the post meta on the supported post types.
	 */
	public function register_post_meta(): void {
		register_meta_helper(
			'post',
			$this->get_supported_post_types(),
			'wp_curate_deduplication',
			[
				'type' => 'boolean',
			]
		);
	}
}
