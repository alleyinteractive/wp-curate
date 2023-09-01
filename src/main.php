<?php
/**
 * Contains the main plugin function
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

use Alley\WP\Default_Post_Queries;
use Alley\WP\Global_Post_Query;
use Alley\WP\Used_Post_IDs;
use WP_Block_Type_Registry;

/**
 * Instantiate the plugin.
 *
 * @throws \Exception For bad parameters.
 */
function main(): void {
	$features = [];

	$features[] = new Features\Core_Query_Block_Integration();
	$features[] = new Features\Query_Block_Context(
		default_post_queries: new Default_Post_Queries(),
		used_post_ids: new Used_Post_IDs(),
		main_query: new Global_Post_Query( 'wp_query' ),
		default_per_page: get_option( 'posts_per_page', 10 ),
		block_type_registry: WP_Block_Type_Registry::get_instance(),
	);

	foreach ( $features as $feature ) {
		$feature->boot();
	}
}

