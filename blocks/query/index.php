<?php
/**
 * Block Name: Query.
 *
 * @package wp-curate
 */

use Byline_Manager\Models\Profile;

/**
 * Registers the block using the metadata loaded from the `block.json` file.
 * Behind the scenes, it registers also all assets so they can be enqueued
 * through the block editor in the corresponding context.
 *
 * @see https://developer.wordpress.org/reference/functions/register_block_type/
 */
function wp_curate_query_block_init(): void {
	// Register the block by passing the location of block.json.
	register_block_type(
		__DIR__,
		[
			'render_callback' => 'wp_curate_render_query_block',
		],
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

/**
 * Provide the 'query' as context to a rendered block.
 *
 * @param array<mixed>  $context      Default context.
 * @param WP_Block      $parsed_block Block being rendered, filtered by `render_block_data`.
 * @param WP_Block|null $parent_block If this is a nested block, a reference to the parent block.
 * @return array<mixed> Context.
 */
function wp_curate_query_block_context( $context, $parsed_block, $parent_block ): array {
	if (
		! isset( $parsed_block['blockName'], $parsed_block['attrs'] )
		|| 'wp-curate/query' !== $parsed_block['blockName']
	) {
		return $context;
	}

	/*
	$attributes = $parsed_block['attrs'];

	if ( isset( $attributes['name'] ) ) {
		if ( 'profile-archive' === $attributes['name'] ) {
			$profile = Profile::get_by_post( get_the_ID() );
			if ( $profile instanceof Profile ) {
				$context['query'] = [
					'postType'  => 'post',
					'taxQuery'  => [
						'byline' => [ $profile->byline_id ],
					],
					'foundRows' => true,
					'perPage'   => 15,
				];
			}
		}
	}
	*/

	return $context;
}
add_filter( 'render_block_context', 'wp_curate_query_block_context', 10, 3 );
