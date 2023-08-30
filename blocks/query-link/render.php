<?php
/**
 * All of the parameters passed to the function where this file is being required are accessible in this scope:
 *
 * @var array<string> $attributes The array of attributes for this block.
 * @var string        $content    Rendered block output. ie. <InnerBlocks.Content />.
 * @var WP_Block      $block      The instance of the WP_Block class that represents the block being rendered.
 *
 * @package wp-curate
 */

use Alley\WP\WP_Curate\WP_Utils;

$wp_curate_link = $attributes['urlOverride'] ?? '';

if (
	strlen( $wp_curate_link ) < 1
	&& isset( $block->context['curation']['provider'] )
	&& is_string( $block->context['curation']['provider'] )
) :
	$wp_curate_provider = $block->context['curation']['provider'];

	if ( taxonomy_exists( $wp_curate_provider ) && isset( $block->context['curation'][ $wp_curate_provider ] ) ) :
		$wp_curate_term = get_term( $block->context['curation'][ $wp_curate_provider ], $wp_curate_provider );

		if ( WP_Utils::is_wp_term( $wp_curate_term ) ) :
			$wp_curate_term_link = get_term_link( $wp_curate_term, $wp_curate_provider ); // @phpstan-ignore-line

			if ( is_string( $wp_curate_term_link ) ) {
				$wp_curate_link = $wp_curate_term_link;
			}
		endif;
	endif;
endif;

if ( strlen( $wp_curate_link ) > 0 ) :
	?>
	<a
		href="<?php echo esc_url( $wp_curate_link ); ?>"
		<?php echo wp_kses_data( get_block_wrapper_attributes() ); ?>
	>
		<?php echo wp_kses_post( $attributes['seeAllText'] ); ?>
		<?php echo esc_html( $content ); ?>
	</a>
	<?php
endif;
