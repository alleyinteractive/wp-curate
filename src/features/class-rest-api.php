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
		add_filter( 'rest_post_query', [ $this, 'add_type_param' ], 10, 2 );
	}

	/**
	 * Add post_type to rest post query if the type param is set.
	 *
	 * @param array<array<int, string>|string> $query_args The existing query args.
	 * @param WP_REST_Request                  $request The REST request.
	 * @return array<array<int, string>|string>
	 */
	// @phpstan-ignore-next-line
	public function add_type_param( $query_args, $request ): array { // phpcs:ignore Squiz.Commenting.FunctionComment.WrongStyle
		$type = $request->get_param( 'type' );

		if ( ! empty( $type ) && is_string( $type ) ) {
			$types                   = explode( ',', $type );
			$types                   = array_filter( $types, 'post_type_exists' );
			$query_args['post_type'] = $types;
		}

		return $query_args;
	}
}
