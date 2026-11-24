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

use Alley\WP\WP_Curate\Channels\Queues;

if ( ! isset( $block->context['wp-curate/queues'] ) || ! $block->context['wp-curate/queues'] instanceof Queues ) {
	return;
}

$queues = $block->context['wp-curate/queues'];

/*
 * The block type skips its inner blocks, so they render here. Then the block can count the posts
 * that they show. Each block that shows a post, such as a Single Post or a block of another plugin,
 * got its ID from `Queues::take()`, which counts it. A Channel Loop and the blocks in its template
 * count too.
 *
 * A copy of this block renders the inner blocks as a block type that is not registered, like
 * `Post_Template` does, so that the `render_block` filters and the supports of this block do not apply a
 * second time. Unlike a new `WP_Block`, the copy keeps the context that the inner blocks got from
 * this block, such as its channel and the context around it.
 *
 * Core gives a block type that is not registered a null type too, though the type of the property
 * does not allow it.
 */
$inner                            = clone $block;
$inner->name                      = 'core/null';
$inner->block_type                = null; // @phpstan-ignore assign.propertyType
$inner->parsed_block['blockName'] = 'core/null';

$given_before  = $queues->given_count();
$inner_content = $inner->render( [ 'dynamic' => false ] );

// Without any posts, the block shows nothing, so other inner blocks, such as a heading, do not show alone.
if ( $queues->given_count() === $given_before ) {
	return;
}
?>

<div <?php echo wp_kses_data( get_block_wrapper_attributes() ); ?>>
	<?php echo $inner_content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>
