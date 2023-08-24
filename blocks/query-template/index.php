<?php
/**
 * Block Name: Query Template.
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
function wp_curate_query_template_block_init(): void {
	// Register the block by passing the location of block.json.
	register_block_type(
		__DIR__,
		[
			'render_callback'   => 'wp_curate_render_query_template_block',
			'skip_inner_blocks' => true,
		],
	);
}
add_action( 'init', 'wp_curate_query_template_block_init' );

/**
 * Renders the `wp-curate/query-template` block on the server.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Block default content.
 * @param WP_Block $block      Block instance.
 * @return string Block output.
 */
function wp_curate_render_query_template_block( $attributes, $content, $block ): string {
	$content = '';

	if ( isset( $block->context['queries'] ) && is_array( $block->context['queries'] ) ) {
		foreach ( $block->context['queries'] as $query ) {
			if ( is_array( $query ) ) {
				$block_instance              = $block->parsed_block;
				$block_instance['blockName'] = 'wp-curate/query';
				$block_instance['attrs']     = $query;

				$content .= render_block( $block_instance );
			}
		}
	}

	return $content;
}
