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

/*
 * The `wp-curate/channels` block support gives the block its post as the `postId` context: the ref,
 * or else the top of the channel's queue. It is 0 when there is no post to show.
 *
 * A block without a channel takes no post. Its `postId` context is then the post of an outer block
 * or of the page, which it must not show. It also does not show its pin, because a pin is a post of
 * the channel. Keep the rule matched with `Channel_Block_Support`: inside a Channel Content block,
 * the block has the channel of that block. Outside one, it has its own.
 */
$channel       = [];
$promoted_post = null;

if ( isset( $attributes['channel'] ) && is_array( $attributes['channel'] ) ) {
	$channel = $attributes['channel'];
}

if ( isset( $block->context['wp-curate/channel'] ) && is_array( $block->context['wp-curate/channel'] ) ) {
	$channel = $block->context['wp-curate/channel'];
}

if ( ! isset( $channel['name'] ) || ! is_string( $channel['name'] ) || '' === $channel['name'] ) {
	return;
}

if ( isset( $block->context['postId'] ) && is_int( $block->context['postId'] ) && $block->context['postId'] > 0 ) {
	$promoted_post = get_post( $block->context['postId'] );
}

if ( ! $promoted_post instanceof WP_Post ) {
	return;
}

// Assume that the parsed block has the correct shape.
$inner = new WP_Block( $block->parsed_block ); // @phpstan-ignore-line argument.type

// Give the post to the inner blocks, the way that a Query Loop gives each post to its template.
$filter_block_context = static function ( $context ) use ( $promoted_post ) {
	if ( is_array( $context ) ) {
		$context['postId']   = $promoted_post->ID;
		$context['postType'] = $promoted_post->post_type;
	}

	return $context;
};

/*
 * Some post blocks read the global post instead of the context, such as `core/post-title` with
 * `get_the_title()`. Set it like a Query Loop does, then restore the post that was there before.
 */
global $post;

$previous_post = $post;
$post          = $promoted_post;

setup_postdata( $post );
add_filter( 'render_block_context', $filter_block_context, 1 );

$post_classes = implode( ' ', get_post_class( '', $promoted_post ) );
?>

<article <?php echo wp_kses_data( get_block_wrapper_attributes( [ 'class' => $post_classes ] ) ); ?>>
	<?php echo $inner->render( [ 'dynamic' => false ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</article>

<?php
remove_filter( 'render_block_context', $filter_block_context, 1 );

$post = $previous_post;

if ( $post instanceof WP_Post ) {
	setup_postdata( $post );
}
