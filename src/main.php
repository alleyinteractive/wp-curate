<?php
/**
 * Contains the main plugin function
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

use Alley\WP\Features\Group;
use Alley\WP\Post_IDs\Empty_Post_IDs;
use Alley\WP\Post_Queries\Default_Post_Queries;
use Alley\WP\Post_Query\Global_Post_Query;
use Alley\WP\WP_Curate\Post_IDs\History;
use WP_Block_Type_Registry;

/**
 * Instantiate the plugin.
 */
function main(): void {
	$stop_queries_var = 'wp_curate_stop_queries';

	$plugin = new Group(

		/*
		 * This feature checks query objects for our custom query var before they execute and stops
		 * them before they execute if the query var is true. It's responsible only for stopping
		 * queries, while individual features are responsible for applying the query var.
		 */
		new Features\Stop_Queries(
			query_var: $stop_queries_var,
		),
		new Features\Core_Query_Block_Integration(),
		new Features\Query_Block_Context(
			post_queries: new Default_Post_Queries(),
			history: new History(
				seed: new Empty_Post_IDs(),
			),
			main_query: new Global_Post_Query( 'wp_query' ),
			default_per_page: (int) get_option( 'posts_per_page', 10 ), // @phpstan-ignore-line
			stop_queries_var: $stop_queries_var,
			block_type_registry: WP_Block_Type_Registry::get_instance(),
		),
		new Features\Parsely_Support(),
		new Features\Rest_Api(),
		new Features\GraphQL(),
	);

	$plugin->boot();
}
