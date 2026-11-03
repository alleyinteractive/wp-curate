<?php
/**
 * Channel_Loop_Single_Posts class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;
use WP_Block_Type;
use WP_Block_Type_Registry;

/**
 * Gives each Channel Loop block its Single Post blocks before it renders.
 *
 * A Channel Loop block saves its Single Post blocks in its `posts` attribute, in the shape of the editor's
 * `InnerBlockTemplate`, such as `[["wp-curate/single-post",{"ref":7}],["wp-curate/single-post"]]`. It saves
 * the template of the Single Post blocks as its inner blocks, with their HTML. Before it renders, its inner
 * blocks become the Single Post blocks, and the inner blocks of each Single Post block become the template.
 */
final readonly class Channel_Loop_Single_Posts implements Feature {
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
		add_filter( 'render_block_data', [ $this, 'filter_render_block_data' ] );
	}

	/**
	 * Filters the block being rendered in render_block(), before it's processed, to give a Channel Loop
	 * block its Single Post blocks.
	 *
	 * @phpstan-param mixed $parsed_block
	 *
	 * @param array $parsed_block An associative array of the block being rendered. See WP_Block_Parser_Block.
	 * @return mixed
	 */
	public function filter_render_block_data( $parsed_block ) {
		if (
			! is_array( $parsed_block )
			|| ! isset( $parsed_block['blockName'] )
			|| 'wp-curate/channel-loop' !== $parsed_block['blockName']
		) {
			return $parsed_block;
		}

		$block_type = $this->block_type_registry->get_registered( 'wp-curate/channel-loop' );

		if ( ! $block_type instanceof WP_Block_Type ) {
			return $parsed_block;
		}

		$attrs         = [];
		$posts         = [];
		$inner_blocks  = [];
		$inner_content = [];
		$inner_html    = '';
		$single_posts  = [];

		if ( isset( $parsed_block['attrs'] ) && is_array( $parsed_block['attrs'] ) ) {
			$attrs = $parsed_block['attrs'];
		}

		// The block's attributes, including the default `posts` when the block does not save them.
		$attributes = $block_type->prepare_attributes_for_render( $attrs );

		if ( isset( $attributes['posts'] ) && is_array( $attributes['posts'] ) ) {
			$posts = $attributes['posts'];
		}

		if ( isset( $parsed_block['innerBlocks'] ) && is_array( $parsed_block['innerBlocks'] ) ) {
			$inner_blocks = $parsed_block['innerBlocks'];
		}

		if ( isset( $parsed_block['innerContent'] ) && is_array( $parsed_block['innerContent'] ) ) {
			$inner_content = $parsed_block['innerContent'];
		}

		if ( isset( $parsed_block['innerHTML'] ) && is_string( $parsed_block['innerHTML'] ) ) {
			$inner_html = $parsed_block['innerHTML'];
		}

		foreach ( $posts as $item ) {
			// Only Single Post blocks can be in a Channel Loop block.
			if ( ! is_array( $item ) || ! isset( $item[0] ) || 'wp-curate/single-post' !== $item[0] ) {
				continue;
			}

			$item_attrs = [];

			if ( isset( $item[1] ) && is_array( $item[1] ) ) {
				$item_attrs = $item[1];
			}

			$single_posts[] = [
				'attrs'        => $item_attrs,
				'blockName'    => 'wp-curate/single-post',
				'innerBlocks'  => $inner_blocks,
				'innerContent' => $inner_content,
				'innerHTML'    => $inner_html,
			];
		}

		$parsed_block['innerBlocks']  = $single_posts;
		$parsed_block['innerContent'] = array_fill( 0, count( $single_posts ), null );
		$parsed_block['innerHTML']    = '';

		return $parsed_block;
	}
}
