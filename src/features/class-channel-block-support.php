<?php
/**
 * Channel_Block_Support class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;
use WP_Block_Type;
use WP_Block_Type_Registry;

/**
 * The `wp-curate/channels` block support.
 *
 * A block that supports `wp-curate/channels` gets a `channel` attribute and the channel context, including
 * `postId` and `postType` for channels that read it.
 *
 * Like a block binding, the `channel` attribute is an object with the channel `name` and the `args` to pass to
 * the channel, such as `{"name":"wp_curate_post_category_latest","args":{"term":7}}`.
 *
 * A block that also provides the `wp-curate/channel` context, like Channel Content, passes its channel to its inner
 * blocks. The support does not take posts, and does not change the `postId` and `postType` context of any block. That
 * context stays the post around the block, so that its channel can read it.
 *
 * An empty channel name means no channel. Inside a block that provides the channel, a block has the channel of that
 * block, so it has no channel if that block has none. Outside one, it has its own channel.
 *
 * Every block with the support gets the channel that it has as the `wp-curate/queue` context, with the same shape as
 * the `channel` attribute. A block that has no channel gets an empty name. Read this context instead of applying the
 * rule above again, the way that core's Post Template reads the `query` context.
 *
 * A block that shows posts takes them itself when it renders, with `Queues::take()`. It finds its queue from its
 * `wp-curate/queue` context and its `context`, which has the post around it as `postId`. In the editor, its block type
 * gives a `channelPostsToTake` callback that returns the same posts. The Single Post block takes one post, its pin or
 * else the top of the queue, and gives that post to its inner blocks. The Channel Loop block renders a Single Post block for
 * each post that remains in its queue. See the `render.php` of each block.
 *
 * Blocks that use the same channel, arguments, and context share a queue, so they do not show the same post twice.
 * Blocks in other queues can show the same post. See `Queues`.
 *
 * Keep the rules matched with the `channelSupport` editor script.
 */
final readonly class Channel_Block_Support implements Feature {
	/**
	 * Constructor.
	 *
	 * @param WP_Block_Type_Registry $block_type_registry Core block type registry.
	 */
	public function __construct(
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
			// Like `block_has_support()`, an array of settings also turns on the support.
			&& ( true === $args['supports']['wp-curate/channels'] || is_array( $args['supports']['wp-curate/channels'] ) )
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

			// The channel of a parent block, the queues to take a post from, and the channel that the block has.
			$uses_context[] = 'wp-curate/channel';
			$uses_context[] = 'wp-curate/queues';
			$uses_context[] = 'wp-curate/queue';

			$args['attributes']   = $attributes;
			$args['uses_context'] = array_values( array_unique( $uses_context ) );
		}

		return $args;
	}

	/**
	 * Filters the default context provided to a rendered block to give it its channel.
	 *
	 * Every block with `wp-curate/channels` support gets its channel as the `wp-curate/queue`
	 * context. The block takes its posts itself when it renders.
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

		if ( ! $block_type instanceof WP_Block_Type || ! block_has_support( $block_type, 'wp-curate/channels' ) ) {
			return $context;
		}

		$attrs = [];

		if ( isset( $parsed_block['attrs'] ) && is_array( $parsed_block['attrs'] ) ) {
			$attrs = $parsed_block['attrs'];
		}

		// The parsed block does not save default values, such as a channel that a third-party block type gives itself.
		if (
			! array_key_exists( 'channel', $attrs )
			&& isset( $block_type->attributes['channel'] )
			&& is_array( $block_type->attributes['channel'] )
			&& array_key_exists( 'default', $block_type->attributes['channel'] )
		) {
			$attrs['channel'] = $block_type->attributes['channel']['default'];
		}

		$own_channel = [];

		if ( isset( $attrs['channel'] ) && is_array( $attrs['channel'] ) ) {
			$own_channel = $attrs['channel'];
		}

		$channel      = $this->channel_name( $own_channel );
		$channel_args = $this->channel_args( $own_channel );

		// A block inside a parent block uses its channel and arguments, even if the block has its own from before it moved in.
		if ( isset( $context['wp-curate/channel'] ) && is_array( $context['wp-curate/channel'] ) ) {
			$channel      = $this->channel_name( $context['wp-curate/channel'] );
			$channel_args = $this->channel_args( $context['wp-curate/channel'] );
		}

		/*
		 * Set the key on every block, also without a channel. Inner blocks get the context of the
		 * blocks around them, so a block without the key would read the channel of an outer block.
		 */
		$context['wp-curate/queue'] = [
			'name' => $channel,
			'args' => $channel_args,
		];

		return $context;
	}

	/**
	 * The channel name in a `channel` attribute or context.
	 *
	 * @param mixed[] $value The attribute or context.
	 * @return string The name, or an empty string for no channel.
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
