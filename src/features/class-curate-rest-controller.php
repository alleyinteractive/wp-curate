<?php
/**
 * Custom REST controller for the WP Curate post type.
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use WP_REST_Posts_Controller;
use WP_REST_Request;
use WP_Query;
use WP_REST_Response;
use WP_Error;
use WP_Post;

/**
 * Extends the default posts controller to support multiple post types.
 */
class Curate_Rest_Controller extends WP_REST_Posts_Controller {
    /**
     * Constructor for the custom REST controller.
     */
    public function __construct() {
        parent::__construct('wp-curate');
    }

    /**
     * Retrieves a collection of posts, supporting multiple post types.
     *
     * @param WP_REST_Request $request The REST request object.
     * @return WP_REST_Response|WP_Error The response object or WP_Error.
     */
    public function get_items( $request ) {
        // Fetch allowed post types via filter, defaulting to 'post'.
        $allowed_post_types = apply_filters('wp_curate_allowed_post_types', ['post']);
        
        // Retrieve 'post_type' parameter and filter allowed post types.
        $requested_types = $request->get_param('post_type');
        $post_types = ! empty( $requested_types ) ? array_filter( 
            is_array($requested_types) ? $requested_types : explode(',', $requested_types), 
            function( $type ) use ( $allowed_post_types ) {
                return in_array( $type, $allowed_post_types, true );
            }
        ) : $allowed_post_types;

        // Setup query arguments.
        $args = [
            'post_type'      => $post_types,
            'post_status'    => 'publish',
            'posts_per_page' => $request->get_param('per_page') ?: 2,
        ];

        // Handle 'include' parameter for specific post IDs.
        $include = $request->get_param('include');
        if ( ! empty( $include ) ) {
            // Ensure 'post__in' is an array of positive integers.
            $args['post__in'] = array_map('absint', is_array( $include ) ? $include : explode( ',', $include ));

            // Preserve the order of included posts.
            $args['orderby'] = 'post__in';
        }

        // Execute the query with the defined arguments.
        $query = new WP_Query( $args );
        $posts = $query->posts;

        // Return an empty response if no posts are found.
        if ( empty( $posts ) ) {
            return new WP_REST_Response( [] );
        }

        // Format the response data by preparing each post for the response.
        $data = array_map( function( $post ) use ( $request ) {
            $response = $this->prepare_item_for_response( $post, $request );
            return $this->prepare_response_for_collection( $response );
        }, $posts);

        // Create the REST response with the formatted data.
        $response = new WP_REST_Response( $data );
        $response->header('X-WP-Total', $query->found_posts); // Add total number of posts found.
        $response->header('X-WP-TotalPages', ceil( $query->found_posts / $args['posts_per_page'] )); // Add total number of pages.

        return $response;
    }

    /**
     * Prepares a single post for response.
     *
     * @param WP_Post         $post    The post object.
     * @param WP_REST_Request $request The REST request object.
     * @return WP_REST_Response The response object.
     */
    public function prepare_item_for_response( $post, $request ) {
        // Utilize the default controller to prepare the post for response.
        $controller = new WP_REST_Posts_Controller( $post->post_type );
        $response = $controller->prepare_item_for_response( $post, $request );
        
        // Return an empty response if an error is encountered.
        return is_wp_error( $response ) ? new WP_REST_Response([]) : $response;
    }
}
