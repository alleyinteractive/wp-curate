<?php
/**
 * The render callback for the wp-curate/single-post block.
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
 * The block takes its post here: the ref, or else the top of its channel's queue. Its own `postId`
 * context stays the post around it, which the channel can read to find its queue. Only the inner
 * blocks get the post that it takes.
 *
 * The block support gives the block the channel that it has as the `wp-curate/queue` context. A
 * block without a channel takes no post and shows nothing, not even its pin, because a pin is a
 * post of the channel.
 */
$queue         = [];
$channel_name  = '';
$channel_args  = [];
$ref           = 0;
$post_id       = null;
$promoted_post = null;

if ( isset( $block->context['wp-curate/queue'] ) && is_array( $block->context['wp-curate/queue'] ) ) {
	$queue = $block->context['wp-curate/queue'];
}

if ( isset( $queue['name'] ) && is_string( $queue['name'] ) ) {
	$channel_name = $queue['name'];
}

if ( isset( $queue['args'] ) && is_array( $queue['args'] ) ) {
	$channel_args = $queue['args'];
}

if (
	'' === $channel_name
	|| ! isset( $block->context['wp-curate/queues'] )
	|| ! $block->context['wp-curate/queues'] instanceof Queues
) {
	return;
}

if ( isset( $attributes['ref'] ) && is_int( $attributes['ref'] ) ) {
	$ref = $attributes['ref'];
}

/*
 * The block takes one post. Keep it matched with the `channelPostsToTake` callback of the block type in the
 * editor. The ID leaves the queue even if visitors cannot see the post, but then the block gets null.
 */
$post_id = $block->context['wp-curate/queues']->take( $channel_name, [ $ref ], $channel_args, $block->context )[0] ?? null;

if ( is_int( $post_id ) && $post_id > 0 ) {
	$promoted_post = get_post( $post_id );
}

if ( ! $promoted_post instanceof WP_Post ) {
	return;
}

/*
 * The inner blocks get the post, and the channel of a Channel Content block around this block. So a
 * channel block inside uses the channel of that Channel Content block, like any block inside it.
 * The queue walk gives the same context in the editor.
 */
$post_content = ( new Post_Template( $block ) )->render( $promoted_post );
$post_classes = implode( ' ', get_post_class( '', $promoted_post ) );
?>

<article <?php echo wp_kses_data( get_block_wrapper_attributes( [ 'class' => $post_classes ] ) ); ?>>
	<?php echo $post_content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</article>
