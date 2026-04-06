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
	 * Filter the maximum number of posts that can be displayed in the Query block.
	 *
	 * @param integer $max_posts The maximum number of posts to display.
	 */
	$max_posts = apply_filters( 'wp_curate_max_posts', 10 );

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
			'allowedPostTypes'   => array_filter(
				array_map(
					function ( $slug ) {
						$post_type_object = get_post_type_object( $slug );
						if ( ! $post_type_object ) {
							return null;
						}
						return (
							[
								'name' => $post_type_object->labels->singular_name, // @phpstan-ignore property.notFound, property.nonObject
								'slug' => $slug,
							]
						);
					},
					$allowed_post_types
				)
			),
			'allowedTaxonomies'  => array_filter(
				array_map(
					function ( $slug ) {
						$taxonomy = get_taxonomy( $slug );
						if ( ! $taxonomy ) {
							return null;
						}
						return (
							[
								'name'      => $taxonomy->labels->singular_name, // @phpstan-ignore property.notFound, property.nonObject
								'slug'      => $slug,
								'rest_base' => $taxonomy->rest_base, // @phpstan-ignore property.notFound
							]
						);
					},
					$allowed_taxonomies,
				),
			),
			'parselyAvailable'   => $parsely_available ? 'true' : 'false',
			'maxPosts'           => $max_posts,
			/**
			 * Filters the order by options shown in the sidebar of the query block.
			 *
			 * @param array<string, string> $options The order by options as value => label pairs.
			 *
			 * @since 2.6.4
			 */
			'rawOrderByOptions'  => apply_filters( 'wp_curate_order_by_options', [
				'date'  => __( 'Date', 'wp-curate' ),
				'title' => __( 'Title', 'wp-curate' ),
			] ),
			/**
			 * Filters the meta keys available for ordering posts.
			 *
			 * @param array<string> $meta_keys The meta keys that can be used for ordering posts.
			 *
			 * @since 2.6.4
			 */
			'orderByMetaKeys'    => apply_filters( 'wp_curate_order_by_meta_keys', [] ),
			/**
			 * Filters whether to allow scheduled posts to be selected in the post picker.
			 *
			 * @since 3.1.0
			 *
			 * @param bool $include_future_posts Whether to include scheduled posts.
			 */
			'includeFuturePosts' => apply_filters( 'wp_curate_include_future_posts', false ),
		],
	);
}
add_action( 'init', 'wp_curate_query_block_init', 900 );

/**
 * Renders the `wp-curate/query` block on the server.
 *
 * @param array<mixed> $attributes Block attributes.
 * @param string       $content    Block default content.
 * @return string Block output.
 */
function wp_curate_render_query_block( $attributes, $content ): string {
	$proc = new WP_HTML_Tag_Processor( $content );

	$found = false;

	while ( $proc->next_tag( [ 'tag_name' => 'div' ] ) ) {
		if ( $proc->get_attribute( 'class' ) && str_contains( (string) $proc->get_attribute( 'class' ), 'wp-block-wp-curate-post' ) ) {
			$found = true;
			break;
		}
	}

	/*
	 * If a query returns no posts -- denoted by the absence of an item with class `wp-block-wp-curate-post`
	 * in the content -- don't show any of the inner content.
	 *
	 * This approach is not great because the inner blocks will have been rendered already and their
	 * scripts and styles will have been enqueued, but it's not clear what other options are
	 * available because the post template inner block needs to render for us to know whether there
	 * are any posts to begin with.
	 */
	return $found ? $content : '';
}
