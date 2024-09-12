<?php
/**
 * Plugin Name: WP Curate
 * Plugin URI: https://github.com/alleyinteractive/wp-curate
 * Description: Plugin to curate homepages and other landing pages
 * Version: 2.3.3
 * Author: Alley Interactive
 * Author URI: https://github.com/alleyinteractive/wp-curate
 * Requires at least: 6.4
 * Tested up to: 6.4
 *
 * Text Domain: wp-curate
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

use Composer\InstalledVersions;
use function add_action;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Root directory to this plugin.
 */
define( 'WP_CURATE_DIR', __DIR__ );

// Check if Composer is installed (remove if Composer is not required for your plugin).
if ( ! file_exists( __DIR__ . '/vendor/wordpress-autoload.php' ) ) {
	// Will also check for the presence of an already loaded Composer autoloader
	// to see if the Composer dependencies have been installed in a parent
	// folder. This is useful for when the plugin is loaded as a Composer
	// dependency in a larger project.
	if ( ! class_exists( InstalledVersions::class ) ) {
		add_action(
			'admin_notices',
			function () {
				?>
				<div class="notice notice-error">
					<p><?php esc_html_e( 'Composer is not installed and wp-curate cannot load. Try using a `*-built` branch if the plugin is being loaded as a submodule.', 'wp-curate' ); ?></p>
				</div>
				<?php
			}
		);

		return;
	}
} else {
	// Load Composer dependencies.
	require_once __DIR__ . '/vendor/wordpress-autoload.php';
}

// Load the plugin's main files.
require_once __DIR__ . '/src/assets.php';
require_once __DIR__ . '/src/meta.php';
require_once __DIR__ . '/src/main.php';

// Make sure all dependency plugins are loaded before we instantiate the plugin.
add_action( 'plugins_loaded', __NAMESPACE__ . '\main' );
