<?php
/**
 * This file contains REST API endpoints.
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

use Alley\WP\WP_Curate\WP_Utils;
use WP_REST_Response;
use WP_REST_Request;
use WP_REST_Server;

/**
 * REST API namespace.
 *
 * @var string
 */
const REST_NAMESPACE = 'wp-curate/v1';

/**
 * Register the REST API routes.
 */
function register_rest_routes(): void {
	// Retrieve the query heading.
	register_rest_route(
		REST_NAMESPACE,
		'/query-heading',
		[
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => __NAMESPACE__ . '\rest_query_heading',
			'permission_callback' => '__return_true',
		]
	);
}
add_action( 'rest_api_init', __NAMESPACE__ . '\register_rest_routes' );

/**
 * Send API response for REST endpoint to retrieve the query heading.
 *
 * @param WP_REST_Request $request REST request data.
 * @return WP_REST_Response REST API response.
 */
function rest_query_heading( WP_REST_Request $request ): WP_REST_Response {
    $data     = '';
	$source   = $request->get_param( 'source' );
	$custom   = $request->get_param( 'custom' );
	$term_id  = $request->get_param( 'term_id' );
	$taxonomy = $request->get_param( 'taxonomy' );

    if ( 'custom' === $source && isset( $custom ) ) :
		$data = $custom;
	endif;

	if ( 'termId' === $source && isset( $term_id, $taxonomy ) ) :
		$term = get_term( $term_id, $taxonomy );
		
		if ( WP_Utils::is_wp_term( $term ) ) :
			$data = html_entity_decode( $term->name );
		endif;
	endif;

	// Send the response.
	return rest_ensure_response( $data );
}
