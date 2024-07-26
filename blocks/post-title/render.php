<?php
/**
 * The render callback for the wp-curate/post-title block.
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

$current_post_id    = $block->context['postId'] ?? 0;
$custom_post_titles = $attributes['customPostTitles'] ?? [];
$post_title         = get_the_title( $current_post_id );
$post_link          = get_the_permalink( $current_post_id );
$level              = $attributes['level'] ?? 3;
$tag_name           = 0 === $level ? 'p' : "h{$level}";

// Use custom post title, if available.
foreach ( $custom_post_titles as $value ) {
	if ( $value['postId'] === $current_post_id ) {
		$post_title = $value['title'];
	}
}
?>
<<?php echo esc_attr( $tag_name ) . ' ' . wp_kses_data( get_block_wrapper_attributes() ); ?>>
	<a href="<?php echo esc_url( $post_link ); ?>">
		<?php echo esc_html( $post_title ); ?>
	</a>
</<?php echo esc_attr( $tag_name ); ?>>
