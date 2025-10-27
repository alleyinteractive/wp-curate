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
	->with_sqlite()
	->with_theme( 'twentytwentyfour' ) // Tied to the minium WordPress version the plugin supports.
	->loaded( fn () => require_once __DIR__ . '/../wp-curate.php' )
	->install();
