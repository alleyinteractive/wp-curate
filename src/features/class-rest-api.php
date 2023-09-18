<?php
/**
 * Rest_Api class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;

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
		add_filter( 'rest_post_query', [ $this, 'add_type_param' ], 10, 2 );
	}

	/**
	 * Add post_type to rest post query if the type param is set.
	 *
	 * @param array<array<int, string>|string> $query_args The existing query args.
	 * @param \WP_REST_Request                 $request The REST request.
	 * @return array<array<int, string>|string>
	 */
	public function add_type_param( $query_args, $request ): array { // @phpstan-ignore-line
		if ( ! empty( $request->get_param( 'type' ) ) && is_string( $request->get_param( 'type' ) ) ) {
			$types                   = explode( ',', $request->get_param( 'type' ) );
			$types                   = array_filter( $types, 'post_type_exists' );
			$query_args['post_type'] = $types;
		}
		return $query_args;
	}
}
