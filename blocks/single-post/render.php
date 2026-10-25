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

use Alley\WP\WP_Curate\Channels\Channel_Queues;

$channel = '';
$ref     = 0;
$queues  = null;
$post_id = null;

if ( isset( $attributes['channel'] ) && is_string( $attributes['channel'] ) ) {
	$channel = $attributes['channel'];
}

if ( isset( $attributes['ref'] ) && is_int( $attributes['ref'] ) && $attributes['ref'] > 0 ) {
	$ref = $attributes['ref'];
}

if ( isset( $block->context['wp-curate/channelQueues'] ) ) {
	$queues = $block->context['wp-curate/channelQueues'];
}

if ( $ref > 0 ) {
	$post_id = $ref;
}

// Take the ref, or else the top of the channel's queue, and remove that ID from the queue.
if ( $queues instanceof Channel_Queues ) {
	$post_id = $queues->take_one( $channel, $ref, $block->context );
}

$promoted_post = null;

if ( is_int( $post_id ) && $post_id > 0 ) {
	$promoted_post = get_post( $post_id );
}

// A ref can be a post that visitors cannot see, such as a draft, so the block renders nothing.
if ( ! $promoted_post instanceof WP_Post || ! is_post_publicly_viewable( $promoted_post ) ) {
	return;
}

// Assume that $parsed_block has the correct shape.
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
?>

<div <?php echo wp_kses_data( get_block_wrapper_attributes() ); ?>>
	<?php echo $inner->render( [ 'dynamic' => false ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>

<?php
remove_filter( 'render_block_context', $filter_block_context, 1 );

$post = $previous_post;

if ( $post instanceof WP_Post ) {
	setup_postdata( $post );
}
