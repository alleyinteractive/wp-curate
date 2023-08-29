<?php
/**
 * All of the parameters passed to the function where this file is being required are accessible in this scope:
 *
 * @var array<mixed> $attributes The array of attributes for this block.
 * @var string       $content    Rendered block output. ie. <InnerBlocks.Content />.
 * @var WP_Block     $block      The instance of the WP_Block class that represents the block being rendered.
 *
 * @package wp-curate
 */

use Alley\WP\WP_Curate\WP_Curate;

$wp_curate_heading       = '';
$wp_curate_heading_level = $attributes['level'] ?? 2;

if ( ! empty( $attributes['override'] ) ) : // Static heading override.
	$wp_curate_heading = $attributes['override'];
elseif ( isset( $block->context['curation'] ) ) : // Dynamic heading based on block context.
	$wp_curate_heading = WP_Curate::get_query_heading( $block->context['curation'] );
endif;

if ( is_string( $wp_curate_heading ) && '' !== $wp_curate_heading ) :
	?>
		<h<?php echo esc_attr( $wp_curate_heading_level); ?>
			<?php echo wp_kses_data( get_block_wrapper_attributes( [ 'class' => 'wp-block-heading' ] ) ); ?>>
			<?php echo esc_html( $wp_curate_heading ); ?>
		</h<?php echo esc_attr( $wp_curate_heading_level); ?>>
	<?php
endif;
