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

$wp_curate_heading = '';

if ( isset( $block->context['heading']['source'] ) ) :
	if ( 'custom' === $block->context['heading']['source'] && isset( $block->context['heading']['custom'] ) ) :
		$wp_curate_heading = $block->context['heading']['custom'];
	endif;

	if (
		'termId' === $block->context['heading']['source']
		&& isset( $block->context['heading']['termId'], $block->context['heading']['taxonomy'] )
	) :
		$wp_curate_term = get_term( $block->context['heading']['termId'], $block->context['heading']['taxonomy'] );

		if ( $wp_curate_term instanceof WP_Term ) :
			$wp_curate_heading = html_entity_decode( $wp_curate_term->name );
		endif;
	endif;

	if ( is_string( $wp_curate_heading ) && '' !== $wp_curate_heading ) :
		?>
			<h2 <?php echo wp_kses_data( get_block_wrapper_attributes( [ 'class' => 'wp-block-heading' ] ) ); ?>>
				<?php echo esc_html( $wp_curate_heading ); ?>
			</h2>
		<?php
	endif;
endif;
