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
		$search_term      = $request->get_param( 'search' ) ?? '';
		$offset           = $request->get_param( 'offset' ) ?? 0;
		$post_type_string = $request->get_param( 'post_type' ) ?? 'post';
		$per_page         = $request->get_param( 'per_page' ) ?? 20;
		$trending         = 'true' === $request->get_param( 'trending' ) ? true : false;
		$tax_relation     = $request->get_param( 'tax_relation' ) ?? 'OR';

		$allowed_taxonomies = apply_filters( 'wp_curate_allowed_taxonomies', [ 'category', 'post_tag' ] );
		$taxonomies         = array_map( 'get_taxonomy', $allowed_taxonomies );
		$tax_query          = [];
		foreach ( $taxonomies as $taxonomy ) {
			$tax_param = $request->get_param( $taxonomy->rest_base );
			$terms     = $tax_param['terms'] ?? [];
			$operator  = $tax_param['operator'] ?? 'OR';
			if ( empty( $terms ) ) {
				continue;
			}
			$terms       = explode( ',', $terms );
			$terms       = array_map( 'intval', $terms );
			$terms       = array_filter( $terms, 'term_exists' );
			$tax_query[] = [
				'taxonomy' => $taxonomy->name,
				'field'    => 'term_id',
				'terms'    => $terms,
				'operator' => 'AND' === $operator ? 'AND' : 'IN',
			];
		}
		if ( ! empty( $tax_query ) && 1 < count( $tax_query ) ) {
			$tax_query['relation'] = $tax_relation;
		}

		$post_types         = explode( ',', $post_type_string );
		$allowed_post_types = apply_filters( 'wp_curate_allowed_post_types', [ 'post' ] );

		$post_types = array_filter(
			$post_types,
			function ( $post_type ) use ( $allowed_post_types ) {
				return in_array( $post_type, $allowed_post_types, true );
			}
		);

		$args = [
			'post_type'           => $post_types,
			'posts_per_page'      => $per_page,
			'offset'              => $offset,
			'ignore_sticky_posts' => true,
			'fields'  		      => 'ids',
		];
		if ( ! empty( $search_term ) ) {
			$args['s'] = $search_term;
		}
		if ( ! empty( $tax_query ) ) {
			$args['tax_query'] = $tax_query; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
		}

		if ( $trending ) {
			$posts = apply_filters( 'wp_curate_trending_posts_query', [], $args );
		}
		if ( empty( $posts ) ) {
			$query = new \WP_Query( $args );
			$posts = $query->posts;
		}
		return $posts;
	}
}
