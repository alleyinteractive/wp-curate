<?php
/**
 * The render callback for the wp-curate/is-false block.
 *
 * All of the parameters passed to the function where this file is being required are accessible in this scope:
 *
 * @phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound -- File doesn't load in global scope, just appears to to PHPCS.
 *
 * @var array    $attributes The array of attributes for this block.
 * @var string   $content    Rendered block output. ie. <InnerBlocks.Content />.
 * @var WP_Block $block      The instance of the WP_Block class that represents the block being rendered.
 *
 * @package wp-curate
 */

?>
<p <?php echo wp_kses_data( get_block_wrapper_attributes() ); ?>>
	<?php esc_html_e( 'Is false - hello from a dynamic block!' ); ?>
</p>
