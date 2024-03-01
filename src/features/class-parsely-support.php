<?php
/**
 * Parsely_Support class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;

/**
 * Add support for Parsely, if the plugin in installed.
 */
final class Parsely_Support implements Feature {
	/**
	 * Set up.
	 */
	public function __construct() {}

    /**
	 * Boot the feature.
	 */
	public function boot(): void {
        if ( ! class_exists( 'Parsely\Parsely' ) ) {
            return;
        }
        add_filter( 'wp_curate_use_parsely', '__return_true' );
	}
}
