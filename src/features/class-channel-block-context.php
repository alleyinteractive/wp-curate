<?php
/**
 * Channel_Block_Context class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;
use Alley\WP\WP_Curate\Channels\Default_Channel;
use WP_Block;

/**
 * Gives top-level blocks the post's default channel as the `wp-curate/channel` block context.
 *
 * Core passes the context to the blocks inside them. A Many Posts block replaces it with its own
 * channel for the blocks inside it, through `providesContext`. Keep the rules matched with
 * `useBlockChannel()`.
 */
final readonly class Channel_Block_Context implements Feature {
	/**
	 * The block context that holds the channel.
	 *
	 * @var string
	 */
	private const CONTEXT = 'wp-curate/channel';

	/**
	 * Constructor.
	 *
	 * @param Default_Channel $default_channel The global default channel.
	 * @param string          $meta_key        The post meta key of the post's default channel.
	 */
	public function __construct(
		private Default_Channel $default_channel,
		private string $meta_key,
	) {}

	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_filter( 'render_block_context', [ $this, 'filter_render_block_context' ], 10, 3 );
	}

	/**
	 * Filters the default context provided to a rendered block.
	 *
	 * @phpstan-param mixed $context
	 *
	 * @param array         $context      Default context.
	 * @param mixed[]       $parsed_block The block being rendered.
	 * @param WP_Block|null $parent_block The parent block, or null for a top-level block.
	 * @return mixed
	 */
	public function filter_render_block_context( $context, $parsed_block, $parent_block ) {
		if ( ! is_array( $context ) ) {
			return $context;
		}

		$channel = '';

		// A top-level block gets the default channel of its post.
		if ( ! $parent_block instanceof WP_Block && isset( $context['postId'] ) && is_int( $context['postId'] ) ) {
			$post_default = get_post_meta( $context['postId'], $this->meta_key, true );

			if ( is_string( $post_default ) ) {
				$channel = $post_default;
			}
		}

		// A top-level block outside a post, or in a post type without the meta, gets the global default.
		if ( ! $parent_block instanceof WP_Block ) {
			$context[ self::CONTEXT ] = $this->default_channel->or_default( $channel );
		}

		return $context;
	}
}
