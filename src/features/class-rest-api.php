<?php
/**
 * Rest_Api class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;
use WP_REST_Request;

/**
 * Look for a special query var that indicates a query should not run.
 */
final class Rest_Api implements Feature {
	/**
	 * Set up.
	 */
	public function __construct() {}

	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_action( 'rest_api_init', [ $this, 'register_endpoints' ] );
	}

	/**
	 * Sets up the endpoint.
	 *
	 * @return void
	 */
	public function register_endpoints(): void {
		register_rest_route(
			'wp-curate/v1',
			'/posts/',
			[
				'methods'             => 'GET',
				'callback'            => [ $this, 'get_posts' ],
				'permission_callback' => function () {
					return true;
					return current_user_can( 'edit_posts' );
				},
			]
		);
	}

	/**
	 * Gets the posts.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return array
	 */
	public function get_posts( WP_REST_Request $request ): array {
		$search_term    = $request->get_param( 'search' ) ?? '';
		$offset         = $request->get_param( 'offset' ) ?? 0;
		$postTypeString = $request->get_param( 'post_type' ) ?? 'post';
		$per_page       = $request->get_param( 'per_page' ) ?? 20;
		$trending       = $request->get_param( 'trending' ) ?? false;

		$post_types         = explode( ',', $postTypeString );
		$allowed_post_types = apply_filters( 'wp_curate_allowed_post_types', [ 'post' ] );

		$post_types = array_filter( $post_types, function ( $post_type ) use ( $allowed_post_types ) {
			return in_array( $post_type, $allowed_post_types, true );
		} );

		$args = [
			'post_type'      => $post_types,
			'posts_per_page' => $per_page,
			'offset'         => $offset,
		];
		if ( ! empty( $search_term ) ) {
			$args['s'] = $search_term;
		}

		$query = new \WP_Query( $args );

		$posts = [];

		return $query->posts;
	}
}
