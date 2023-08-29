<?php
/**
 * WP_Curate class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

/**
 * Example Plugin
 */
class WP_Curate {
	public function __construct() {
		add_filter( 'rest_post_query', [ $this, 'add_type_param' ], 10, 2 );
	}

	/**
	 * Add post_type to rest post query if the type param is set.
	 *
	 * @param array            $query_args The existing query args.
	 * @param \WP_Rest_Request $request The REST request.
	 * @return array
	 */
	public function add_type_param( $query_args, $request ) {
		if ( ! empty( $request->get_param( 'type' ) ) ) {
			$types                   = explode( ',', $request->get_param( 'type' ) );
			$types                   = array_filter( $types, 'post_type_exists' );
			$query_args['post_type'] = $types;
		}
		return $query_args;
	}
}
