<?php
/**
 * Block Name: Query.
 *
 * @package wp-curate
 */

use Alley\WP\WP_Curate\Supported_Post_Types;

/**
 * Registers the block using the metadata loaded from the `block.json` file.
 * Behind the scenes, it registers also all assets so they can be enqueued
 * through the block editor in the corresponding context.
 *
 * @see https://developer.wordpress.org/reference/functions/register_block_type/
 */
function wp_curate_query_block_init(): void {
	$supported_post_types = new Supported_Post_Types();

	if ( ! $supported_post_types->should_register_block() ) {
		return;
	}

	// Register the block by passing the location of block.json.
	register_block_type(
		__DIR__,
		[
			'render_callback' => 'wp_curate_render_query_block',
		],
	);

	/**
	 * Filter the post types that can be used in the Query block.
	 *
	 * @param array<string> $allowed_post_types The allowed post types.
	 */
	$allowed_post_types = apply_filters( 'wp_curate_allowed_post_types', [ 'post' ] );

	/**
	 * Filter the taxonomies that can be used in the Query block.
	 *
	 * @param array<string> $allowed_taxonomies The allowed taxonomies.
	 */
	$allowed_taxonomies = apply_filters( 'wp_curate_allowed_taxonomies', [ 'category', 'post_tag' ] );

	/**
	 * Filter whether to use Parsely.
	 *
	 * @param bool $use_parsely Whether to use Parsely.
	 */
	$parsely_available = apply_filters( 'wp_curate_use_parsely', false );
	wp_localize_script(
		'wp-curate-query-editor-script',
		'wpCurateQueryBlock',
		[
			'allowedPostTypes'  => $allowed_post_types,
			'allowedTaxonomies' => $allowed_taxonomies,
			'parselyAvailable'  => $parsely_available ? 'true' : 'false',
		]
	);
}
add_action( 'init', 'wp_curate_query_block_init' );

/**
 * Renders the `wp-curate/query` block on the server.
 *
 * @param array<mixed> $attributes Block attributes.
 * @param string       $content    Block default content.
 * @return string Block output.
 */
function wp_curate_render_query_block( $attributes, $content ): string {
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
