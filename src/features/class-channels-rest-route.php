<?php
/**
 * Channels_REST_Route class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;
use Alley\WP\WP_Curate\Channels\Channel;
use Alley\WP\WP_Curate\Channels\Registered_Channels;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

/**
 * Exposes the channels and the IDs in a channel to the editor.
 */
final readonly class Channels_REST_Route implements Feature {
	/**
	 * Constructor.
	 *
	 * @param Registered_Channels $channels        Available channels.
	 * @param Channel             $default_channel The global default channel.
	 */
	public function __construct(
		private Registered_Channels $channels,
		private Channel $default_channel,
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
			'/channels',
			[
				'args'                => [
					'context' => [
						'default' => [],
						'type'    => 'object',
					],
				],
				'callback'            => [ $this, 'get_items' ],
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => '__return_true',
			],
		);

		register_rest_route(
			'wp-curate/v1',
			'/channels/(?P<name>[a-z0-9_-]+)',
			[
				'args'                => [
					'args'     => [
						'default' => [],
						'type'    => 'object',
					],
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
					'search'   => [
						'default' => '',
						'type'    => 'string',
					],
				],
				'callback'            => [ $this, 'get_item' ],
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => '__return_true',
			],
		);
	}

	/**
	 * Respond with details of each channel that the user can read.
	 *
	 * @param WP_REST_Request $request REST API request.
	 * @return WP_REST_Response
	 */
	public function get_items( WP_REST_Request $request ): WP_REST_Response {
		$out = [];

		$available_context = $request->get_param( 'context' );
		$user_id           = get_current_user_id();

		if ( ! is_array( $available_context ) ) {
			$available_context = [];
		}

		foreach ( $this->channels->all() as $channel ) {
			if ( ! $channel->can_read( $user_id ) ) {
				continue;
			}

			$out[] = [
				// Cast to object, like the `args` of a route in the REST API index.
				'args'         => (object) $channel->args(),
				'available'    => $channel->available( array_intersect_key( $available_context, array_flip( $channel->uses_context() ) ) ),
				'default'      => $channel->name() === $this->default_channel->name(),
				'label'        => $channel->label(),
				'name'         => $channel->name(),
				'uses_context' => $channel->uses_context(),
			];
		}

		return rest_ensure_response( $out );
	}

	/**
	 * Respond with a page of the channel's IDs.
	 *
	 * @param WP_REST_Request $request REST API request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_item( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$response = new WP_Error( 'rest_channel_invalid_name', __( 'Invalid channel name.', 'wp-curate' ), [ 'status' => 404 ] );

		$block_args         = $request->get_param( 'args' );
		$available_context  = $request->get_param( 'context' );
		$requested_page     = $request->get_param( 'page' );
		$requested_per_page = $request->get_param( 'per_page' );
		$requested_search   = $request->get_param( 'search' );

		$page     = 1;
		$per_page = 10;
		$search   = '';

		if ( is_int( $requested_page ) ) {
			$page = $requested_page;
		}

		if ( is_int( $requested_per_page ) ) {
			$per_page = $requested_per_page;
		}

		if ( is_string( $requested_search ) ) {
			$search = trim( $requested_search );
		}

		foreach ( $this->channels->all() as $channel ) {
			if ( $channel->name() === $request->get_param( 'name' ) && ! $channel->can_read( get_current_user_id() ) ) {
				$response = new WP_Error( 'rest_forbidden', __( 'Sorry, you are not allowed to read this channel.', 'wp-curate' ), [ 'status' => rest_authorization_required_code() ] );
				break;
			}

			if ( $channel->name() === $request->get_param( 'name' ) ) {
				$args    = [];
				$context = [];

				if ( is_array( $block_args ) ) {
					$args = array_intersect_key( $block_args, $channel->args() );
				}

				if ( is_array( $available_context ) ) {
					$context = array_intersect_key( $available_context, array_flip( $channel->uses_context() ) );
				}

				$channel_ids = $channel->ids( $args, $context );
				$total       = $channel->total( $args, $context );

				if ( '' !== $search ) {
					$channel_ids = $channel->ids_matching( $search, $args, $context );
					$total       = $channel->total_matching( $search, $args, $context );
				}

				$ids        = [];
				$post_types = [];
				$offset     = ( $page - 1 ) * $per_page;
				$position   = 0;
				$has_more   = false;

				// Read the channel only through this page, plus one ID to tell whether more remain.
				foreach ( $channel_ids as $id ) {
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

				$response->header( 'X-WP-Total', (string) $total );
				$response->header( 'X-WP-TotalPages', (string) ceil( $total / $per_page ) );

				break;
			}
		}

		return $response;
	}
}
