<?php
/**
 * Channel_Block_Support class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;
use Alley\WP\WP_Curate\Channels\Channel_Queues;
use WP_Block_Type;
use WP_Block_Type_Registry;
use WP_Post;

/**
 * The `wp-curate/channel` block support, for blocks that have a channel.
 *
 * A block with the support gets a `channel` attribute and the channel context. Like a block binding,
 * the attribute is an object with the channel `name` and the `args` that the block gives the
 * channel, such as `{"name":"latest_post_in_category","args":{"term":7}}`. An empty name means the
 * post's default channel. A block that also provides the `wp-curate/channel` context, like Many
 * Posts, gives its channel to the blocks inside it, which use it instead of their own. Any other block takes a post from its channel's queue
 * and gets that post as the `postId` and `postType` context, which is 0 and an empty string when
 * the channel has no posts left. It can pin a post with an integer `ref` attribute. Keep the rules
 * matched with the `channelSupport` editor script.
 */
final readonly class Channel_Block_Support implements Feature {
	/**
	 * The block support.
	 *
	 * @var string
	 */
	private const SUPPORT = 'wp-curate/channel';

	/**
	 * The block context that holds the channel.
	 *
	 * @var string
	 */
	private const CHANNEL_CONTEXT = 'wp-curate/channel';

	/**
	 * The block context that holds the post's default channel.
	 *
	 * @var string
	 */
	private const DEFAULT_CONTEXT = 'wp-curate/defaultChannel';

	/**
	 * The block context that holds the channel queues.
	 *
	 * @var string
	 */
	private const QUEUES_CONTEXT = 'wp-curate/channelQueues';

	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_filter( 'register_block_type_args', [ $this, 'filter_register_block_type_args' ] );

		// After `Channel_Block_Context` and `Channel_Queues_Block_Context` add their context.
		add_filter( 'render_block_context', [ $this, 'filter_render_block_context' ], 20, 2 );
	}

	/**
	 * Gives a block with the support a `channel` attribute and the context that it needs.
	 *
	 * The editor gets the attribute and the context from the block type on the server, so a block
	 * registered with block.json does not declare them.
	 *
	 * @phpstan-param mixed $args
	 *
	 * @param array $args Arguments for registering a block type.
	 * @return mixed
	 */
	public function filter_register_block_type_args( $args ) {
		if (
			! is_array( $args )
			|| ! isset( $args['supports'] )
			|| ! is_array( $args['supports'] )
			|| ! isset( $args['supports'][ self::SUPPORT ] )
			|| true !== $args['supports'][ self::SUPPORT ]
		) {
			return $args;
		}

		$attributes   = [];
		$uses_context = [];

		if ( isset( $args['attributes'] ) && is_array( $args['attributes'] ) ) {
			$attributes = $args['attributes'];
		}

		if ( isset( $args['uses_context'] ) && is_array( $args['uses_context'] ) ) {
			$uses_context = array_filter( $args['uses_context'], 'is_string' );
		}

		/*
		 * The default has a key, so that the editor gets an object and not an empty array. A block that
		 * provides the channel always provides an object, even without a channel of its own.
		 */
		$attributes['channel'] ??= [
			'type'    => 'object',
			'default' => [
				'name' => '',
			],
		];

		$uses_context[] = self::CHANNEL_CONTEXT;
		$uses_context[] = self::DEFAULT_CONTEXT;
		$uses_context[] = self::QUEUES_CONTEXT;

		$args['attributes']   = $attributes;
		$args['uses_context'] = array_values( array_unique( $uses_context ) );

		return $args;
	}

	/**
	 * Gives a block with the support that does not provide the channel context a post from its
	 * channel.
	 *
	 * Blocks take posts in render order, so this runs once for each block, just before it renders.
	 *
	 * @phpstan-param mixed $context
	 * @phpstan-param mixed $parsed_block
	 *
	 * @param array $context      Default context.
	 * @param array $parsed_block The block being rendered.
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

		$block_type = WP_Block_Type_Registry::get_instance()->get_registered( $parsed_block['blockName'] );

		if (
			! $block_type instanceof WP_Block_Type
			|| ! block_has_support( $block_type, self::SUPPORT )
			|| isset( $block_type->provides_context[ self::CHANNEL_CONTEXT ] )
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

		// A block without its own channel uses the post's default channel.
		if ( '' === $channel && isset( $context[ self::DEFAULT_CONTEXT ] ) && is_string( $context[ self::DEFAULT_CONTEXT ] ) ) {
			$channel = $context[ self::DEFAULT_CONTEXT ];
		}

		// A block inside a Many Posts block uses its channel and arguments, even if the block has its own from before it moved in.
		if ( isset( $context[ self::CHANNEL_CONTEXT ] ) && is_array( $context[ self::CHANNEL_CONTEXT ] ) ) {
			$channel      = $this->channel_name( $context[ self::CHANNEL_CONTEXT ] );
			$channel_args = $this->channel_args( $context[ self::CHANNEL_CONTEXT ] );
		}

		if ( isset( $attrs['ref'] ) && is_int( $attrs['ref'] ) && $attrs['ref'] > 0 ) {
			$ref = $attrs['ref'];
		}

		// Take the ref, or else the top of the channel's queue, and remove that ID from the queue.
		if ( isset( $context[ self::QUEUES_CONTEXT ] ) && $context[ self::QUEUES_CONTEXT ] instanceof Channel_Queues ) {
			$post_id = $context[ self::QUEUES_CONTEXT ]->take_one( $channel, $ref, $channel_args, $context );
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
	 * @return string The name, or an empty string for the post's default channel.
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
