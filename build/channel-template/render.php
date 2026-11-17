<?php
/**
 * The render callback for the wp-curate/channel-template block.
 *
 * All of the parameters passed to the function where this file is being required are accessible in this scope:
 *
 * @phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound -- File doesn't load in global scope, just appears to to PHPCS.
 * @phpcs:disable WordPress.WP.GlobalVariablesOverride.Prohibited -- File doesn't load in global scope, just appears to to PHPCS.
 *
 * @var mixed[]  $attributes The array of attributes for this block.
 * @var string   $content    Rendered block output. ie. <InnerBlocks.Content />.
 * @var WP_Block $block      The instance of the WP_Block class that represents the block being rendered.
 *
 * @package wp-curate
 */

use Alley\WP\WP_Curate\Channels\Queues;

/*
 * The `wp-curate/channels` block support took the posts that remain in the block's channel's queue,
 * and removed them from the queue. It gives the block the first post as `postId`. The queues keep
 * every post that the block took.
 */
$channel_posts = [];

if ( isset( $block->context['wp-curate/queues'] ) && $block->context['wp-curate/queues'] instanceof Queues ) {
	foreach ( $block->context['wp-curate/queues']->taken_by( $block->parsed_block ) as $channel_post_id ) {
		$channel_post = get_post( $channel_post_id );

		// Like the block's `postId`, a published post can still be one that visitors cannot see.
		if ( $channel_post instanceof WP_Post && is_post_publicly_viewable( $channel_post ) ) {
			$channel_posts[] = $channel_post;
		}
	}
}

if ( [] === $channel_posts ) {
	return;
}

/*
 * Some post blocks read the global post instead of the context, such as `core/post-title` with
 * `get_the_title()`. Set it like a Query Loop does, then restore the post that was there before.
 */
global $post;

$previous_post = $post;
$posts_content = '';

foreach ( $channel_posts as $channel_post ) {
	/*
	 * Like core's Post Template, render the template as a block type that is not registered, so
	 * that the supports of this block, such as its layout, do not apply to each copy.
	 */
	$template              = $block->parsed_block;
	$template['blockName'] = 'core/null';

	// Give the post to the template, the way that a Query Loop gives each post to its template.
	$filter_block_context = static function ( $context ) use ( $channel_post ) {
		if ( is_array( $context ) ) {
			$context['postId']   = $channel_post->ID;
			$context['postType'] = $channel_post->post_type;
		}

		return $context;
	};

	$post = $channel_post;

	setup_postdata( $post );
	add_filter( 'render_block_context', $filter_block_context, 1 );

	// Assume that the parsed block has the correct shape.
	$template_content = new WP_Block( $template )->render( [ 'dynamic' => false ] ); // @phpstan-ignore-line argument.type

	remove_filter( 'render_block_context', $filter_block_context, 1 );

	$posts_content .= sprintf(
		'<article class="%1$s">%2$s</article>',
		esc_attr( implode( ' ', get_post_class( '', $channel_post ) ) ),
		$template_content,
	);
}

$post = $previous_post;

if ( $post instanceof WP_Post ) {
	setup_postdata( $post );
}
?>

<div <?php echo wp_kses_data( get_block_wrapper_attributes() ); ?>>
	<?php echo $posts_content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>
