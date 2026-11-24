<?php
/**
 * The render callback for the wp-curate/channel-loop block.
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

use Alley\WP\WP_Curate\Channels\Post_Template;
use Alley\WP\WP_Curate\Channels\Queues;

/*
 * The block support gives the block its channel as the `wp-curate/queue` context: the channel of
 * the Channel Content block around it, or else its own.
 */
$channel_name = '';
$channel_args = [];

if ( isset( $block->context['wp-curate/queue'] ) && is_array( $block->context['wp-curate/queue'] ) ) {
	if ( isset( $block->context['wp-curate/queue']['name'] ) && is_string( $block->context['wp-curate/queue']['name'] ) ) {
		$channel_name = $block->context['wp-curate/queue']['name'];
	}

	if ( isset( $block->context['wp-curate/queue']['args'] ) && is_array( $block->context['wp-curate/queue']['args'] ) ) {
		$channel_args = $block->context['wp-curate/queue']['args'];
	}
}

if (
	'' === $channel_name
	|| ! isset( $block->context['wp-curate/queues'] )
	|| ! $block->context['wp-curate/queues'] instanceof Queues
) {
	return;
}

$queues = $block->context['wp-curate/queues'];

/*
 * Take every post that remains in the queue, up to `MAX_POSTS`, before any of them renders. A block
 * of another plugin takes its posts in the same way: with one call to `Queues::take()`, and then it
 * renders its inner blocks. The queue walk in the editor uses the same order. Keep the posts matched
 * with the `channelPostsToTake` callback of the block type.
 *
 * So inside a Channel Content block, a block in the template that uses the same queue gets no
 * posts. The blocks after this block get the posts past the limit, if any.
 */
$ids = $queues->take( $channel_name, array_fill( 0, Queues::MAX_POSTS, 0 ), $channel_args, $block->context );

$template      = new Post_Template( $block );
$posts_content = '';

foreach ( $ids as $post_id ) {
	// The queue gives null for a post that visitors cannot see, and after its last post.
	$promoted_post = null;

	if ( is_int( $post_id ) ) {
		$promoted_post = get_post( $post_id );
	}

	if ( ! $promoted_post instanceof WP_Post ) {
		continue;
	}

	/*
	 * The template renders once for each post. Like the template of a Single Post, it gets the post,
	 * and the channel of a Channel Content block around this block.
	 */
	$posts_content .= sprintf(
		'<article class="%s">%s</article>',
		esc_attr( implode( ' ', get_post_class( '', $promoted_post ) ) ),
		$template->render( $promoted_post ),
	);
}

// Like a Single Post without a post, the block shows nothing without posts.
if ( '' === $posts_content ) {
	return;
}
?>

<div <?php echo wp_kses_data( get_block_wrapper_attributes() ); ?>>
	<?php echo $posts_content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>
