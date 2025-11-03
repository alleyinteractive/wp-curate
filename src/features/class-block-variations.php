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
	 * @param array          $variations The block variations.
	 * @param \WP_Block_Type $block_type The block type.
	 * @return array The modified block variations.
	 *
	 * @phpstan-param list<array<string, mixed>> $variations
	 * @phpstan-return list<array<string, mixed>>
	 */
	public function register_variations( $variations, $block_type ) {
		if ( 'wp-curate/query' === $block_type->name ) {
			$variations[] = [
				'name'        => 'wp-curate/title-date',
				'title'       => __( 'Title & Date', 'wp-curate' ),
				'description' => __( 'Each post contains the title and date.', 'wp-curate' ),
				'isDefault'   => true,
				'scope'       => [ 'block' ],
				'attributes'  => [
					'postTypes' => [ 'post' ],
				],
				'innerBlocks' => [
					[
						'name'        => 'core/post-template',
						'attributes'  => [],
						'innerBlocks' => [
							[
								'name'        => 'wp-curate/post',
								'attributes'  => [],
								'innerBlocks' => [
									[
										'name'       => 'wp-curate/post-title',
										'attributes' => [
											'isLink' => true,
										],
									],
									[
										'name'       => 'core/post-date',
										'attributes' => [],
									],
								],
							],
						],
					],
				],
				'icon'        => 'list-view',
			];
			$variations[] = [
				'name'        => 'wp-curate/title-excerpt',
				'title'       => __( 'Title & Excerpt', 'wp-curate' ),
				'description' => __( 'Each post contains the title and excerpt.', 'wp-curate' ),
				'isDefault'   => true,
				'scope'       => [ 'block' ],
				'attributes'  => [
					'postTypes' => [ 'post' ],
				],
				'innerBlocks' => [
					[
						'name'        => 'core/post-template',
						'attributes'  => [],
						'innerBlocks' => [
							[
								'name'        => 'wp-curate/post',
								'attributes'  => [],
								'innerBlocks' => [
									[
										'name'       => 'wp-curate/post-title',
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
					],
				],
				'icon'        => 'list-view',
			];
			$variations[] = [
				'name'        => 'wp-curate/title-date-excerpt',
				'title'       => __( 'Title, Date, & Excerpt', 'wp-curate' ),
				'description' => __( 'Each post contains the title, date, and excerpt.', 'wp-curate' ),
				'isDefault'   => true,
				'scope'       => [ 'block' ],
				'attributes'  => [
					'postTypes' => [ 'post' ],
				],
				'innerBlocks' => [
					[
						'name'        => 'core/post-template',
						'attributes'  => [],
						'innerBlocks' => [
							[
								'name'        => 'wp-curate/post',
								'attributes'  => [],
								'innerBlocks' => [
									[
										'name'       => 'wp-curate/post-title',
										'attributes' => [
											'isLink' => true,
										],
									],
									[
										'name'       => 'core/post-date',
										'attributes' => [],
									],
									[
										'name'       => 'core/post-excerpt',
										'attributes' => [],
									],
								],
							],
						],
					],
				],
				'icon'        => 'list-view',
			];
			$variations[] = [
				'name'        => 'wp-curate/image-date-title',
				'title'       => __( 'Image, Date, & Title', 'wp-curate' ),
				'description' => __( 'Each post contains the image, date, and title.', 'wp-curate' ),
				'isDefault'   => true,
				'scope'       => [ 'block' ],
				'attributes'  => [
					'postTypes' => [ 'post' ],
				],
				'innerBlocks' => [
					[
						'name'        => 'core/post-template',
						'attributes'  => [],
						'innerBlocks' => [
							[
								'name'        => 'wp-curate/post',
								'attributes'  => [],
								'innerBlocks' => [
									[
										'name'       => 'core/post-featured-image',
										'attributes' => [],
									],
									[
										'name'       => 'core/post-date',
										'attributes' => [],
									],
									[
										'name'       => 'wp-curate/post-title',
										'attributes' => [
											'isLink' => true,
										],
									],
								],
							],
						],
					],
				],
				'icon'        => 'list-view',
			];
		}
		return $variations;
	}
}
