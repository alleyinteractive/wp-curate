<?php
/**
 * Contains the main plugin function
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

/**
 * Instantiate the plugin.
 *
 * @throws \Exception For bad parameters.
 */
function main(): void {
	$features = [];

	$features[] = new Features\Core_Query_Block_Integration();
	$features[] = new Features\Query_Block_Context();

	foreach ( $features as $feature ) {
		$feature->boot();
	}
}

