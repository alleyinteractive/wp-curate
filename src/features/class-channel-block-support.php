<?php
/**
 * Channel_Block_Support class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;
use Alley\WP\WP_Curate\Channels\Channel;
use Alley\WP\WP_Curate\Channels\Queues;
use WP_Block_Type;
use WP_Block_Type_Registry;
use WP_Post;

/**
 * The `wp-curate/channels` block support.
 *
 * A block that supports `wp-curate/channels` gets a `channel` attribute and the channel context, including
 * `postId` and `postType` for channels that read it.
 *
 * Like a block binding, the `channel` attribute is an object with the channel `name` and the `args` to pass to
 * the channel, such as `{"name":"post_category_latest","args":{"term":7}}`.
 *
 * A block that also provides the `wp-curate/channel` context, like Channel Content, passes its channel to its inner
 * blocks. Any other block takes a post from its channel's queue and gets that post as the `postId` and `postType` context.
 *
 * Blocks can pin a post with an integer `ref` attribute.
 *
 * Keep the rules matched with the `channelSupport` editor script.
 */
final readonly class Channel_Block_Support implements Feature {
	/**
	 * Constructor.
	 *
	 * @param Channel                $default_channel     The default channel.
	 * @param WP_Block_Type_Registry $block_type_registry Core block type registry.
	 */
	public function __construct(
		private Channel $default_channel,
		private WP_Block_Type_Registry $block_type_registry,
	) {}

	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_filter( 'register_block_type_args', [ $this, 'filter_register_block_type_args' ] );
		add_filter( 'render_block_context', [ $this, 'filter_render_block_context' ], 10, 2 );
	}

	/**
	 * Filters the arguments for registering a block type to give a block with channels support a
	 * `channel` attribute and the context that it needs.
	 *
	 * @phpstan-param mixed $args
	 *
	 * @param array $args Array of arguments for registering a block type.
	 * @return mixed
	 */
	public function filter_register_block_type_args( $args ) {
		if (
			is_array( $args )
			&& isset( $args['supports'] )
			&& is_array( $args['supports'] )
			&& isset( $args['supports']['wp-curate/channels'] )
			&& $args['supports']['wp-curate/channels'] === true
		) {
			$attributes   = [];
			$uses_context = [];

			if ( isset( $args['attributes'] ) && is_array( $args['attributes'] ) ) {
				$attributes = $args['attributes'];
			}

			if ( isset( $args['uses_context'] ) && is_array( $args['uses_context'] ) ) {
				$uses_context = array_filter( $args['uses_context'], 'is_string' );
			}

			$attributes['channel'] ??= [
				'type'    => 'object',
				// Ensure this is serialized as an object.
				'default' => [
					'name' => '',
				],
			];

			// Ensure that this context is available to channels that read context.
			$uses_context[] = 'postId';
			$uses_context[] = 'postType';

			// The channel of a parent block, and the queues to take a post from.
			$uses_context[] = 'wp-curate/channel';
			$uses_context[] = 'wp-curate/queues';

			$args['attributes']   = $attributes;
			$args['uses_context'] = array_values( array_unique( $uses_context ) );
		}

		return $args;
	}

	/**
	 * Filters the default context provided to a rendered block to give it a post from its channel.
	 *
	 * A block gets a post if it has `wp-curate/channels` support and does not itself provide the
	 * `wp-curate/channel` context, like Single Post. A block that provides the context, like
	 * Channel Content, gets no post and instead passes its channel to the blocks inside it.
	 *
	 * @phpstan-param mixed $context
	 * @phpstan-param mixed $parsed_block
	 *
	 * @param array $context      Default context.
	 * @param array $parsed_block An associative array of the block being rendered.
	 * @return mixed
	 */
	public function filter_render_block_context( $context, $parsed_block ) {
		if (
			! is_array( $context )
			|| ! is_array( $parsed_block )
			|| ! isset( $parsed_block['blockName'] )
			|| ! is_string( $parsed_block['blockName'] )
		) {
			return $context;
		}

		$block_type = $this->block_type_registry->get_registered( $parsed_block['blockName'] );

		if (
			! $block_type instanceof WP_Block_Type
			|| ! block_has_support( $block_type, 'wp-curate/channels' )
			|| isset( $block_type->provides_context['wp-curate/channel'] )
		) {
			return $context;
		}

		$attrs   = [];
		$ref     = 0;
		$post_id = null;

		if ( isset( $parsed_block['attrs'] ) && is_array( $parsed_block['attrs'] ) ) {
			$attrs = $parsed_block['attrs'];
		}

		$own_channel = [];

		if ( isset( $attrs['channel'] ) && is_array( $attrs['channel'] ) ) {
			$own_channel = $attrs['channel'];
		}

		$channel      = $this->channel_name( $own_channel );
		$channel_args = $this->channel_args( $own_channel );

		// A block without its own channel uses the default channel.
		if ( '' === $channel ) {
			$channel = $this->default_channel->name();
		}

		// A block inside a parent block uses its channel and arguments, even if the block has its own from before it moved in.
		if ( isset( $context['wp-curate/channel'] ) && is_array( $context['wp-curate/channel'] ) ) {
			$channel      = $this->channel_name( $context['wp-curate/channel'] );
			$channel_args = $this->channel_args( $context['wp-curate/channel'] );
		}

		if ( isset( $attrs['ref'] ) && is_int( $attrs['ref'] ) && $attrs['ref'] > 0 ) {
			$ref = $attrs['ref'];
		}

		// Take the ref, or else the next ID off the top of the channel's queue.
		if ( isset( $context['wp-curate/queues'] ) && $context['wp-curate/queues'] instanceof Queues ) {
			$post_id = $context['wp-curate/queues']->take_one( $channel, $ref, $channel_args, $context );
		}

		$taken = null;

		if ( is_int( $post_id ) && $post_id > 0 ) {
			$taken = get_post( $post_id );
		}

		$context['postId']   = 0;
		$context['postType'] = '';

		// A ref can be a post that visitors cannot see, such as a draft, so the block gets no post.
		if ( $taken instanceof WP_Post && is_post_publicly_viewable( $taken ) ) {
			$context['postId']   = $taken->ID;
			$context['postType'] = $taken->post_type;
		}

		return $context;
	}

	/**
	 * The channel name in a `channel` attribute or context.
	 *
	 * @param mixed[] $value The attribute or context.
	 * @return string The name, or an empty string for the default channel.
	 */
	private function channel_name( array $value ): string {
		$name = '';

		if ( isset( $value['name'] ) && is_string( $value['name'] ) ) {
			$name = $value['name'];
		}

		return $name;
	}

	/**
	 * The arguments for the channel in a `channel` attribute or context.
	 *
	 * @param mixed[] $value The attribute or context.
	 * @return mixed[]
	 */
	private function channel_args( array $value ): array {
		$args = [];

		if ( isset( $value['args'] ) && is_array( $value['args'] ) ) {
			$args = $value['args'];
		}

		return $args;
	}
}
