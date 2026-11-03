<?php
/**
 * Channel_Content_Patterns class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;

/**
 * Block patterns for the Channel Content block.
 */
final class Channel_Content_Patterns implements Feature {
	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_action( 'init', [ $this, 'on_init' ] );
	}

	/**
	 * Fires after WordPress has finished loading but before any headers are sent. Registers the patterns.
	 */
	public function on_init(): void {
		/*
		 * Static blocks, such as Columns and Group, must match the markup that their `save` functions make, or the
		 * editor shows them as invalid.
		 */
		$post_date = '<!-- wp:post-date {"metadata":{"bindings":{"datetime":{"args":{"field":"date"},"source":"core/post-data"}}}} /-->';

		$featured_post = '<!-- wp:post-featured-image {"isLink":true,"aspectRatio":"16/9"} /-->'
			. '<!-- wp:post-title {"isLink":true} /-->'
			. $post_date
			. '<!-- wp:post-excerpt /-->';

		$media_object = '<!-- wp:group {"layout":{"type":"flex","flexWrap":"nowrap","verticalAlignment":"top"}} -->'
			. '<div class="wp-block-group">'
			. '<!-- wp:post-featured-image {"isLink":true,"aspectRatio":"1","width":"96px"} /-->'
			. '<!-- wp:group {"style":{"spacing":{"blockGap":"4px"}},"layout":{"type":"flex","orientation":"vertical"}} -->'
			. '<div class="wp-block-group">'
			. '<!-- wp:post-title {"level":3,"isLink":true} /-->'
			. $post_date
			. '</div><!-- /wp:group -->'
			. '</div><!-- /wp:group -->';

		register_block_pattern(
			'wp-curate/channel-content-featured',
			[
				'blockTypes' => [ 'wp-curate/channel-content' ],
				'categories' => [ 'query' ],
				'content'    => $this->channel_content(
					'<!-- wp:columns --><div class="wp-block-columns">'
					. '<!-- wp:column {"width":"60%"} --><div class="wp-block-column" style="flex-basis:60%">'
					. get_comment_delimited_block_content( 'wp-curate/single-post', [], $featured_post )
					. '</div><!-- /wp:column -->'
					. '<!-- wp:column {"width":"40%"} --><div class="wp-block-column" style="flex-basis:40%">'
					. $this->channel_loop( [], $media_object, 4 )
					. '</div><!-- /wp:column -->'
					. '</div><!-- /wp:columns -->',
				),
				'title'      => __( 'Channel Content: Featured content', 'wp-curate' ),
			],
		);
	}

	/**
	 * A Channel Content block.
	 *
	 * @param string $inner Serialized inner blocks.
	 * @return string
	 */
	private function channel_content( string $inner ): string {
		return get_comment_delimited_block_content( 'wp-curate/channel-content', [], $inner );
	}

	/**
	 * A Channel Loop block with Single Post blocks, which each have their own copy of the template.
	 *
	 * @param mixed[] $attrs    Attributes of the Channel Loop.
	 * @param string  $template Serialized template of the Single Post blocks.
	 * @param int     $count    The number of Single Post blocks.
	 * @return string
	 */
	private function channel_loop( array $attrs, string $template, int $count ): string {
		$single_posts = str_repeat(
			get_comment_delimited_block_content( 'wp-curate/single-post', [], $template ),
			$count,
		);

		return get_comment_delimited_block_content( 'wp-curate/channel-loop', $attrs, $single_posts );
	}
}
