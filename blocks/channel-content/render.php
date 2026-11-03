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

use Alley\WP\WP_Curate\Post_IDs\Channel_Post_IDs_In_Block;

/*
 * The inner blocks have rendered already, in document order. Each Single Post block inside took its
 * post from the queue of this block's channel, which the block gives them as context. Without any
 * posts, the block shows nothing, so other inner blocks, such as a heading, do not show alone.
 */
$channel_posts = new Channel_Post_IDs_In_Block( $block, WP_Block_Type_Registry::get_instance() );

if ( [] === $channel_posts->post_ids() ) {
	return;
}
?>

<div <?php echo wp_kses_data( get_block_wrapper_attributes() ); ?>>
	<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>
