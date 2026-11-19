<?php
/**
 * The render callback for the wp-curate/channel-content block.
 *
 * All of the parameters passed to the function where this file is being required are accessible in this scope:
 *
 * @phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound -- File doesn't load in global scope, just appears to to PHPCS.
 *
 * @var mixed[]  $attributes The array of attributes for this block.
 * @var string   $content    Rendered block output. ie. <InnerBlocks.Content />.
 * @var WP_Block $block      The instance of the WP_Block class that represents the block being rendered.
 *
 * @package wp-curate
 */

/*
 * The inner blocks have rendered already, in document order. Each Single Post block inside took its
 * post from the queue of this block's channel, which this block gives them as context. Without any
 * posts, the block shows nothing, so other inner blocks, such as a heading, do not show alone.
 *
 * A Single Post block renders its wrapper only when it shows a post, so look for that wrapper. The
 * Single Posts that a Channel Loop block renders count too. This does not see the posts that a block
 * of another plugin takes when it renders.
 */
$processor = new WP_HTML_Tag_Processor( $content );

if ( ! $processor->next_tag( [ 'class_name' => 'wp-block-wp-curate-single-post' ] ) ) {
	return;
}
?>

<div <?php echo wp_kses_data( get_block_wrapper_attributes() ); ?>>
	<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>
