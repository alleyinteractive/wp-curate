<?php
/**
 * Block Name: Subquery.
 *
 * @package wp-curate
 */

use Alley\WP\WP_Curate\Supported_Post_Types;


/**
 * Registers the wp-curate/subquery block using the metadata loaded from the `block.json` file.
 */
function subquery_subquery_block_init(): void {
	$supported_post_types = new Supported_Post_Types();

	if ( ! $supported_post_types->should_register_block() ) {
		return;
	}

	// Register the block by passing the location of block.json.
	register_block_type(
		__DIR__,
		[
			'render_callback' => 'wp_curate_render_subquery_block',
		],
	);
}
add_action( 'init', 'subquery_subquery_block_init' );

/**
 * Renders the `wp-curate/query` block on the server.
 *
 * @param array<mixed> $attributes Block attributes.
 * @param string       $content    Block default content.
 * @return string Block output.
 */
function wp_curate_render_subquery_block( $attributes, $content, $block ): string {
	var_dump( $block->context );
	$proc = new WP_HTML_Tag_Processor( $content );

	/*
	 * If a query returns no posts -- denoted by the absence of a list in the content -- don't
	 * show any of the inner content.
	 *
	 * This approach is not great because the inner blocks will have been rendered already and their
	 * scripts and styles will have been enqueued, but it's not clear what other options are
	 * available because the post template inner block needs to render for us to know whether there
	 * are any posts to begin with.
	 */
	return $proc->next_tag( [ 'tag_name' => 'ul' ] ) === true || $proc->next_tag( [ 'tag_name' => 'ol' ] ) === true ? $content : '';
}