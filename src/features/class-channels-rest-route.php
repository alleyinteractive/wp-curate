<?php
/**
 * Channels_REST_Route class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;
use Alley\WP\WP_Curate\Channels\Default_Channel;
use Alley\WP\WP_Curate\Channels\Registered_Channels;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

/**
 * Exposes the channels and the IDs in a channel to the editor.
 *
 * GET /wp-json/wp-curate/v1/channels?context[<key>]=<value>
 *
 * Lists the name and label of each channel, whether it is the global default, the arguments that
 * it reads as `args`, the context that it reads, and whether a block with the `context` can select
 * it.
 *
 * GET /wp-json/wp-curate/v1/channels/<name>?args[<key>]=<value>&context[<key>]=<value>&page=<page>&per_page=<per_page>&search=<search>
 *
 * `args` is the block's arguments for the channel. `context` is the block context that the channel
 * uses. `page` and `per_page` select a page of IDs,
 * so that the editor reads only as many IDs as its blocks need. `search` limits the IDs to the
 * channel's matches.
 *
 * Like core endpoints, the `X-WP-Total` and `X-WP-TotalPages` headers give the number of IDs and
 * pages.
 */
final readonly class Channels_REST_Route implements Feature {
	/**
	 * Constructor.
	 *
	 * @param Registered_Channels $channels        Available channels.
	 * @param Default_Channel     $default_channel The global default channel.
	 */
	public function __construct(
		private Registered_Channels $channels,
		private Default_Channel $default_channel,
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
				'callback'            => [ $this, 'get_list_callback' ],
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => fn () => current_user_can( 'edit_posts' ),
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
				'callback'            => [ $this, 'get_callback' ],
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => fn () => current_user_can( 'edit_posts' ),
			],
		);
	}

	/**
	 * Respond with the name and label of each channel, whether it is the global default, the
	 * arguments that it reads, the context that it reads, and whether a block with the `context` can
	 * select it.
	 *
	 * @param WP_REST_Request $request REST API request.
	 * @return WP_REST_Response
	 */
	public function get_list_callback( WP_REST_Request $request ): WP_REST_Response {
		$available_context = $request->get_param( 'context' );
		$list              = [];

		if ( ! is_array( $available_context ) ) {
			$available_context = [];
		}

		foreach ( $this->channels->all() as $channel ) {
			$list[] = [
				// An object even without arguments, like the `args` of a route in the REST API index.
				'args'         => (object) $channel->args(),
				'is_available' => $channel->is_available( array_intersect_key( $available_context, array_flip( $channel->uses_context() ) ) ),
				'is_default'   => $channel->name() === $this->default_channel->name(),
				'label'        => $channel->label(),
				'name'         => $channel->name(),
				'uses_context' => $channel->uses_context(),
			];
		}

		return rest_ensure_response( $list );
	}

	/**
	 * Respond with a page of the channel's IDs, whether more IDs remain, the type of each post, and the
	 * channel's label, order, and the context that it uses. With `search`, the IDs are the channel's
	 * matches.
	 *
	 * @param WP_REST_Request $request REST API request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_callback( WP_REST_Request $request ): WP_REST_Response|WP_Error {
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

				$offset     = ( $page - 1 ) * $per_page;
				$position   = 0;
				$ids        = [];
				$has_more   = false;
				$post_types = [];

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
