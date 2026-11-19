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

use Alley\WP\WP_Curate\Channels\Queues;

/*
 * The block support gives the block its channel as the `wp-curate/queue` context: the channel of
 * the Channel Content block around it, or else its own. The Single Post blocks below get the same
 * channel and take from its queue.
 */
$own_channel  = [];
$channel_name = '';
$channel_args = [];

if ( isset( $attributes['channel'] ) && is_array( $attributes['channel'] ) ) {
	$own_channel = $attributes['channel'];
}

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
 * Each post is a Single Post block that has the inner blocks of this block. It has no pin. Like any
 * Single Post, it takes the top of the queue as it renders. Inside a Channel Content block, it gets
 * the channel of that block as context. Outside one, it has the channel of this block.
 *
 * The Single Post renders inside a block type that is not registered, like the template of core's
 * Post Template. Core then applies the context filters to the Single Post as to any inner block. The
 * supports of this block, such as its layout, apply only to its own wrapper.
 */
$single_post = [
	'blockName'    => 'core/null',
	'attrs'        => [],
	'innerBlocks'  => [
		[
			'blockName'    => 'wp-curate/single-post',
			'attrs'        => [
				'channel' => $own_channel,
			],
			'innerBlocks'  => $block->parsed_block['innerBlocks'],
			'innerHTML'    => $block->parsed_block['innerHTML'],
			'innerContent' => $block->parsed_block['innerContent'],
		],
	],
	'innerHTML'    => '',
	'innerContent' => [ null ],
];

/*
 * The most Single Post blocks to render. Each takes one of the posts that the block type's
 * `channelPostsToTake` callback gives in the editor.
 */
$limit = Queues::MAX_POSTS;

$rendered      = 0;
$posts_content = '';
$has_posts     = false;

/*
 * Give the Single Post the context of this block. This file cannot read `$block->available_context`,
 * because the property is protected. The block support gives this block and Single Post the same
 * context keys, such as `postId`, which a channel can read to find its queue. A key that a site
 * adds only to Single Post is lost.
 */
$single_post_context = $block->context;

while ( $rendered < $limit && null !== $queues->top( $channel_name, $channel_args, $block->context ) ) {
	$wrapper       = new WP_Block( $single_post, $single_post_context );
	$rendered_post = $wrapper->render();

	$posts_content .= $rendered_post;

	++$rendered;

	/*
	 * A Single Post renders its wrapper only when it shows a post. It shows nothing when it took a
	 * post that visitors cannot see, and the loop goes on to the next post.
	 */
	if ( ! $has_posts ) {
		$has_posts = new WP_HTML_Tag_Processor( $rendered_post )->next_tag( [ 'class_name' => 'wp-block-wp-curate-single-post' ] );
	}
}

// Like a Single Post without a post, the block shows nothing without posts.
if ( ! $has_posts ) {
	return;
}
?>

<div <?php echo wp_kses_data( get_block_wrapper_attributes() ); ?>>
	<?php echo $posts_content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>
