<?php
/**
 * Channels_REST_Route class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;
use Alley\WP\WP_Curate\Channels\Channel;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

/**
 * Exposes the IDs in a channel to the editor.
 *
 * GET /wp-json/wp-curate/v1/channels/<name>?context[<key>]=<value>&page=<page>&per_page=<per_page>
 *
 * `context` is the block context that the channel uses. `page` and `per_page` select a page of IDs,
 * so that the editor reads only as many IDs as its blocks need.
 */
final readonly class Channels_REST_Route implements Feature {
	/**
	 * Constructor.
	 *
	 * @param Channel[] $channels Available channels.
	 */
	public function __construct(
		private array $channels,
	) {}

	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_action( 'rest_api_init', [ $this, 'on_rest_api_init' ] );
	}

	/**
	 * Fires when preparing to serve a REST API request.
	 */
	public function on_rest_api_init(): void {
		register_rest_route(
			'wp-curate/v1',
			'/channels/(?P<name>[a-z0-9_]+)',
			[
				'args'                => [
					'context'  => [
						'default' => [],
						'type'    => 'object',
					],
					'page'     => [
						'default' => 1,
						'minimum' => 1,
						'type'    => 'integer',
					],
					'per_page' => [
						'default' => 10,
						'maximum' => 100,
						'minimum' => 1,
						'type'    => 'integer',
					],
				],
				'callback'            => [ $this, 'get_callback' ],
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => fn () => current_user_can( 'edit_posts' ),
			],
		);
	}

	/**
	 * Respond with a page of the channel's IDs, whether more IDs remain, the type of each post, and the
	 * channel's label, order, and the context that it uses.
	 *
	 * @param WP_REST_Request $request REST API request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_callback( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$response = new WP_Error( 'rest_channel_invalid_name', __( 'Invalid channel name.', 'wp-curate' ), [ 'status' => 404 ] );

		$available_context  = $request->get_param( 'context' );
		$requested_page     = $request->get_param( 'page' );
		$requested_per_page = $request->get_param( 'per_page' );

		$page     = 1;
		$per_page = 10;

		if ( is_int( $requested_page ) ) {
			$page = $requested_page;
		}

		if ( is_int( $requested_per_page ) ) {
			$per_page = $requested_per_page;
		}

		foreach ( $this->channels as $channel ) {
			if ( $channel->name() === $request->get_param( 'name' ) ) {
				$context = [];

				if ( is_array( $available_context ) ) {
					$context = array_intersect_key( $available_context, array_flip( $channel->uses_context() ) );
				}

				$offset     = ( $page - 1 ) * $per_page;
				$position   = 0;
				$ids        = [];
				$has_more   = false;
				$post_types = [];

				// Read the channel only through this page, plus one ID to tell whether more remain.
				foreach ( $channel->ids( $context ) as $id ) {
					// Skip the IDs that `Queue` skips, so that the editor and the page agree.
					if ( $id <= 0 ) {
						continue;
					}

					if ( $position >= $offset + $per_page ) {
						$has_more = true;
						break;
					}

					if ( $position >= $offset ) {
						$ids[] = $id;
					}

					++$position;
				}

				// The editor needs each post's type to load it, since a channel can mix post types.
				if ( 'postType' === $channel->entity_kind() ) {
					_prime_post_caches( $ids, false, false );

					foreach ( $ids as $id ) {
						$post_type = get_post_type( $id );

						if ( is_string( $post_type ) ) {
							$post_types[ $id ] = $post_type;
						}
					}
				}

				$response = rest_ensure_response(
					[
						'entity_kind'  => $channel->entity_kind(),
						'has_more'     => $has_more,
						'ids'          => $ids,
						'label'        => $channel->label(),
						'order'        => $channel->order_direction(),
						'order_label'  => $channel->order_label(),
						'post_types'   => (object) $post_types,
						'uses_context' => $channel->uses_context(),
					],
				);

				break;
			}
		}

		return $response;
	}
}
