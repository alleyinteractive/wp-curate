<?php
/**
 * Feature interface file
 *
 * @package the-wrap
 */

namespace Alley\WP\WP_Curate;

/**
 * Describes a project feature.
 */
interface Feature {
	/**
	 * Boot the feature.
	 */
	public function boot(): void;
}
