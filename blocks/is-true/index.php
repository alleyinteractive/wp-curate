<?php
/**
 * Block Name: Is True.
 *
 * @package wp-curate
 */

/**
 * Registers the block using the metadata loaded from the `block.json` file.
 * Behind the scenes, it registers also all assets so they can be enqueued
 * through the block editor in the corresponding context.
 *
 * @see https://developer.wordpress.org/reference/functions/register_block_type/
 */
function wp_curate_is_true_block_init(): void {
	// Register the block by passing the location of block.json.
	register_block_type(
		__DIR__,
		[
			'render_callback' => fn ( $attributes, $content ) => $content,
		],
	);
}
add_action( 'init', 'wp_curate_is_true_block_init' );

/**
 * Short-circuit the display of blocks inside if the outer condition isn't true.
 *
 * @param string|null   $pre_render   The pre-rendered content. Default null.
 * @param array         $parsed_block The block being rendered.
 * @param WP_Block|null $parent_block If this is a nested block, a reference to the parent block.
 */
function wp_curate_pre_render_is_true_block( $pre_render, $parsed_block, $parent_block ) {
	/*
	 * Previously, the condition block added 'conditionResult' as context to this block. However,
	 * limitations in the context API meant that the context didn't get passed to child blocks when
	 * the condition block was itself a child block. We now pass the condition block back to a
	 * separate function that lives outside the context API and evaluates the result.
	 */
	if (
		isset( $parsed_block['blockName'] )
		&& 'wp-curate/is-true' === $parsed_block['blockName']
		&& $parent_block instanceof WP_Block
		&& isset( $parent_block->parsed_block['blockName'] )
		&& 'wp-curate/condition' === $parent_block->parsed_block['blockName']
	) {
		$context = [];

		if ( isset( $parent_block->context['postId'] ) ) {
			$context['postId'] = $parent_block->context['postId'];
		}

		$result = wp_curate_condition_block_result( $parent_block->parsed_block, $context );

		if ( true !== $result ) {
			$pre_render = '';
		}
	}

	return $pre_render;
}
add_filter( 'pre_render_block', 'wp_curate_pre_render_is_true_block', 10, 3 );
