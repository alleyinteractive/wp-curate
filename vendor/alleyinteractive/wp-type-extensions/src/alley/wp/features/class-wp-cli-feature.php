<?php
/**
 * WP_CLI_Feature class file
 *
 * @package wp-type-extensions
 */

namespace Alley\WP\Features;

use Alley\WP\Types\Feature;

/**
 * Boot a feature only WP-CLI loads.
 */
final class WP_CLI_Feature implements Feature {
	/**
	 * Set up.
	 *
	 * @param Feature $origin Feature instance.
	 */
	public function __construct(
		private readonly Feature $origin,
	) {}

	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_action( 'cli_init', [ $this->origin, 'boot' ] );
	}
}
