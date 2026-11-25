<?php
/**
 * Post_Template class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

use WP_Block;
use WP_Post;

/**
 * Renders the inner blocks of a block that shows posts, once for a post, the way that core's Post Template renders its
 * template for each post.
 *
 * The inner blocks get the post as their `postId` and `postType` context. They also get the channel of the Channel
 * Content block around the block, if there is one, as the `wp-curate/channel` context. A Channel Content block sets the
 * channel of every block inside it, at any depth, until another Channel Content block. A block that shows posts gives
 * its inner blocks a post, not a channel.
 *
 * A block of another plugin that renders its inner blocks with `new WP_Block()` must keep the `wp-curate/channel`
 * context in the same way. This class does that. A block that renders `$content` keeps it already, because core gives
 * the inner blocks the context around the block.
 *
 * Keep the context matched with `useChannelQueue()` in the editor.
 */
final readonly class Post_Template {
	/**
	 * Constructor.
	 *
	 * @param WP_Block $block The block whose inner blocks are the template. Its block type must use the
	 *                        `wp-curate/channel` context, as the `wp-curate/channels` support gives it.
	 */
	public function __construct(
		private WP_Block $block,
	) {}

	/**
	 * Renders the template for a post.
	 *
	 * @param WP_Post $promoted_post The post.
	 * @return string The rendered inner blocks, without a wrapper.
	 */
	public function render( WP_Post $promoted_post ): string {
		/*
		 * Render the inner blocks as a block type that is not registered, like core's Post Template
		 * does, so that the `render_block` filters and the supports of the block do not apply a second
		 * time.
		 */
		$template              = $this->block->parsed_block;
		$template['blockName'] = 'core/null';

		/*
		 * A new `WP_Block` does not get the context around the block. Like Post Template, the inner
		 * blocks get the post from the filter below. Unlike Post Template, they also get the channel of
		 * a Channel Content block around the block.
		 */
		$available_context = [];

		if ( isset( $this->block->context['wp-curate/channel'] ) ) {
			$available_context['wp-curate/channel'] = $this->block->context['wp-curate/channel'];
		}

		// Assume that the parsed block has the correct shape.
		$inner = new WP_Block( $template, $available_context ); // @phpstan-ignore-line argument.type

		// Give the post to the inner blocks, the way that a Query Loop gives each post to its template.
		$filter_block_context = static function ( $context ) use ( $promoted_post ) {
			if ( is_array( $context ) ) {
				$context['postId']   = $promoted_post->ID;
				$context['postType'] = $promoted_post->post_type;
			}

			return $context;
		};

		/*
		 * Some post blocks read the global post instead of the context, such as `core/post-title` with
		 * `get_the_title()`. Set it like a Query Loop does, then restore the post that was there before.
		 */
		global $post;

		$previous_post = $post;
		$post          = $promoted_post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited

		setup_postdata( $post );
		add_filter( 'render_block_context', $filter_block_context, 1 );

		$rendered = $inner->render( [ 'dynamic' => false ] );

		remove_filter( 'render_block_context', $filter_block_context, 1 );

		$post = $previous_post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited

		if ( $post instanceof WP_Post ) {
			setup_postdata( $post );
		}

		return $rendered;
	}
}
