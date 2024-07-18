<?php
/**
 * WP Curate Tests: Bootstrap
 *
 * @package wp-curate
 */

/**
 * Visit {@see https://mantle.alley.com/testing/test-framework.html} to learn more.
 */
\Mantle\Testing\manager()
	->maybe_rsync_plugin()
	// Load the main file of the plugin.
	->loaded( fn () => require_once __DIR__ . '/../wp-curate.php' )
	->install();
