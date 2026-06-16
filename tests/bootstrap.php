<?php
/**
 * WP Curate Tests: Bootstrap
 *
 * @package wp-curate
 */

// Ensure that the plugin is built before proceeding.
if ( ! file_exists( __DIR__ . '/../build/query/index.php' ) ) {
	throw new \RuntimeException( 'The plugin must be built before running tests. Please run `npm run build`.' );
}

/**
 * Visit {@see https://mantle.alley.com/testing/test-framework.html} to learn more.
 */
\Mantle\Testing\manager()
	->maybe_rsync_plugin()
	->with_sqlite()
	->with_theme( 'twentytwentyfour' ) // Tied to the minium WordPress version the plugin supports.
	->loaded( fn () => require_once __DIR__ . '/../wp-curate.php' )
	->install();
