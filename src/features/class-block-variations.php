<?php
/**
 * Block Variations class file
 *
 * @package WP_Curate
 */
namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;

/**
 * Class to register block variations
 */
final class Block_Variations implements Feature {
	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_filter( 'get_block_type_variations', [ $this, 'register_variations' ], 10, 2 );
	}

	/**
	 * Register block variations.
	 *
	 * @param array  $variations The block variations.
	 * @param string $block_name The block name.
	 * @return array The modified block variations.
	 */
	public function register_variations( $variations, $block_name ) {
		if ( 'wp-curate/query' === $block_name->name ) {
			$variations[] = [
				'name'        => 'wp-curate/list-style',
				'title'       => __( 'List', 'wp-curate' ),
				'description' => __( 'A list style variation for the query block.', 'wp-curate' ),
				'attributes'  => [
					'layout' => 'list',
				],
				'isDefault'   => true,
				'scope'       => [ 'block' ],
				'innerBlocks' => [
					[
						'name'       => 'core/post-template',
						'attributes' => [],
						'innerBlocks' => [
							[
								'name'       => 'core/post-title',
								'attributes' => [
									'isLink' => true,
								],
							],
							[
								'name'       => 'core/post-excerpt',
								'attributes' => [],
							],
						],
					],
				],
				'icon'        => 'list-view',
			];
			$variations[] = [
				'name'        => 'wp-curate/grid-style',
				'title'       => __( 'Grid', 'wp-curate' ),
				'description' => __( 'A grid style variation for the query block.', 'wp-curate' ),
				'attributes'  => [
					'layout' => 'grid',
				],
				'scope'       => [ 'block' ],
				'innerBlocks' => [
					[
						'name'       => 'core/post-template',
						'attributes' => [],
						'innerBlocks' => [
							[
								'name'       => 'core/post-featured-image',
								'attributes' => [],
							],
							[
								'name'       => 'core/post-title',
								'attributes' => [
									'isLink' => true,
								],
							],
						],
					],
				],
				'icon'        => 'grid-view',
			];
		}
		return $variations;
	}
}
