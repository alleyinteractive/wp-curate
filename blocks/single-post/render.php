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

use Alley\WP\WP_Curate\Inner_Block_Template;

/*
 * The `wp-curate/channels` block support gives the block its post as the `postId` context: the ref,
 * or else the top of the channel's queue. It is 0 when there is no post to show.
 */
$promoted_post = null;

if ( isset( $block->context['postId'] ) && is_int( $block->context['postId'] ) && $block->context['postId'] > 0 ) {
	$promoted_post = get_post( $block->context['postId'] );
}

if ( ! $promoted_post instanceof WP_Post ) {
	return;
}

$parsed_block = $block->parsed_block;

// Inside a Channel Loop block, the block renders that block's template, not inner blocks of its own.
if ( isset( $block->context['wp-curate/loopTemplate'] ) && is_array( $block->context['wp-curate/loopTemplate'] ) ) {
	$template        = new Inner_Block_Template( $block->context['wp-curate/loopTemplate'] );
	$template_blocks = parse_blocks( $template->serialized_blocks() );

	$parsed_block['innerBlocks']  = $template_blocks;
	$parsed_block['innerHTML']    = '';
	$parsed_block['innerContent'] = array_fill( 0, count( $template_blocks ), null );
}

// Assume that $parsed_block has the correct shape.
$inner = new WP_Block( $parsed_block ); // @phpstan-ignore-line argument.type

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

<article <?php echo wp_kses_data( get_block_wrapper_attributes() ); ?>>
	<?php echo $inner->render( [ 'dynamic' => false ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</article>

<?php
remove_filter( 'render_block_context', $filter_block_context, 1 );

$post = $previous_post;

if ( $post instanceof WP_Post ) {
	setup_postdata( $post );
}
