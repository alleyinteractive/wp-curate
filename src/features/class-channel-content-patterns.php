<?php
/**
 * Channel_Content_Patterns class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;

/**
 * Block patterns for the Channel Content block.
 */
final class Channel_Content_Patterns implements Feature {
	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_action( 'init', [ $this, 'on_init' ] );
	}

	/**
	 * Fires after WordPress has finished loading but before any headers are sent. Registers the patterns.
	 */
	public function on_init(): void {
		$block_types = [ 'wp-curate/channel-content' ];
		$categories  = [ 'query' ];

		register_block_pattern(
			'wp-curate/channel-content-standard',
			[
				'blockTypes' => $block_types,
				'categories' => $categories,
				'content'    => $this->channel_content(
					$this->channel_loop(
						[],
						[
							[ 'core/post-title', [ 'isLink' => true ] ],
							[
								'core/post-featured-image',
								[
									'align'  => 'wide',
									'isLink' => true,
								],
							],
							[ 'core/post-excerpt' ],
							[ 'core/separator' ],
							[ 'core/post-date' ],
						],
						3,
					),
				),
				'title'      => __( 'Channel Content: Standard', 'wp-curate' ),
			],
		);

		register_block_pattern(
			'wp-curate/channel-content-medium',
			[
				'blockTypes' => $block_types,
				'categories' => $categories,
				'content'    => $this->channel_content(
					$this->channel_loop(
						[],
						[
							[
								'core/columns',
								[ 'align' => 'wide' ],
								[
									[
										'core/column',
										[ 'width' => '66.66%' ],
										[
											[ 'core/post-featured-image', [ 'isLink' => true ] ],
										],
									],
									[
										'core/column',
										[ 'width' => '33.33%' ],
										[
											[ 'core/post-title', [ 'isLink' => true ] ],
											[ 'core/post-excerpt' ],
										],
									],
								],
							],
						],
						3,
					),
				),
				'title'      => __( 'Channel Content: Image at left', 'wp-curate' ),
			],
		);

		register_block_pattern(
			'wp-curate/channel-content-small',
			[
				'blockTypes' => $block_types,
				'categories' => $categories,
				'content'    => $this->channel_content(
					$this->channel_loop(
						[],
						[
							[
								'core/columns',
								[ 'verticalAlignment' => 'center' ],
								[
									[
										'core/column',
										[
											'verticalAlignment' => 'center',
											'width' => '25%',
										],
										[
											[ 'core/post-featured-image', [ 'isLink' => true ] ],
										],
									],
									[
										'core/column',
										[
											'verticalAlignment' => 'center',
											'width' => '75%',
										],
										[
											[ 'core/post-title', [ 'isLink' => true ] ],
										],
									],
								],
							],
						],
						3,
					),
				),
				'title'      => __( 'Channel Content: Small image and title', 'wp-curate' ),
			],
		);

		register_block_pattern(
			'wp-curate/channel-content-grid',
			[
				'blockTypes' => $block_types,
				'categories' => $categories,
				'content'    => $this->channel_content(
					$this->channel_loop(
						[
							'layout' => [
								'columnCount' => 3,
								'type'        => 'grid',
							],
						],
						[
							[
								'core/group',
								[
									'style' => [
										'spacing' => [
											'padding' => [
												'bottom' => '30px',
												'left'   => '30px',
												'right'  => '30px',
												'top'    => '30px',
											],
										],
									],
								],
								[
									[ 'core/post-title', [ 'isLink' => true ] ],
									[ 'core/post-excerpt' ],
									[ 'core/post-date' ],
								],
							],
						],
						6,
					),
				),
				'title'      => __( 'Channel Content: Grid', 'wp-curate' ),
			],
		);

		register_block_pattern(
			'wp-curate/channel-content-large-title',
			[
				'blockTypes' => $block_types,
				'categories' => $categories,
				'content'    => $this->channel_content(
					'<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"100px","right":"100px","bottom":"100px","left":"100px"}},"color":{"text":"#ffffff","background":"#000000"}}} -->'
					. '<div class="wp-block-group alignfull has-text-color has-background" style="background-color:#000000;color:#ffffff;padding-top:100px;padding-right:100px;padding-bottom:100px;padding-left:100px">'
					. $this->channel_loop(
						[],
						[
							[
								'core/separator',
								[
									'align'     => 'wide',
									'className' => 'is-style-wide',
									'style'     => [
										'color' => [
											'background' => '#ffffff',
										],
									],
								],
							],
							[
								'core/columns',
								[
									'align'             => 'wide',
									'verticalAlignment' => 'center',
								],
								[
									[
										'core/column',
										[
											'verticalAlignment' => 'center',
											'width' => '20%',
										],
										[
											[
												'core/post-date',
												[
													'fontSize' => 'extra-small',
													'style'    => [
														'color' => [
															'text' => '#ffffff',
														],
													],
												],
											],
										],
									],
									[
										'core/column',
										[
											'verticalAlignment' => 'center',
											'width' => '80%',
										],
										[
											[
												'core/post-title',
												[
													'isLink' => true,
													'style'  => [
														'color'      => [
															'text' => '#ffffff',
														],
														'elements'   => [
															'link' => [
																'color' => [
																	'text' => '#ffffff',
																],
															],
														],
														'typography' => [
															'fontSize'   => '72px',
															'lineHeight' => '1.1',
														],
													],
												],
											],
										],
									],
								],
							],
						],
						3,
					)
					. '</div><!-- /wp:group -->',
				),
				'title'      => __( 'Channel Content: Large title', 'wp-curate' ),
			],
		);

		$offset_post = [
			[ 'core/post-featured-image' ],
			[ 'core/post-title' ],
			[ 'core/post-date' ],
		];

		$spacer = [ 'core/spacer', [ 'height' => '200px' ] ];

		register_block_pattern(
			'wp-curate/channel-content-offset',
			[
				'blockTypes' => $block_types,
				'categories' => $categories,
				'content'    => $this->channel_content(
					'<!-- wp:group {"style":{"spacing":{"padding":{"top":"30px","right":"30px","bottom":"30px","left":"30px"}}}} -->'
					. '<div class="wp-block-group" style="padding-top:30px;padding-right:30px;padding-bottom:30px;padding-left:30px">'
					. '<!-- wp:columns --><div class="wp-block-columns">'
					. '<!-- wp:column {"width":"50%"} --><div class="wp-block-column" style="flex-basis:50%">'
					. $this->channel_loop( [], [ ...$offset_post, $spacer ], 2 )
					. '</div><!-- /wp:column -->'
					. '<!-- wp:column {"width":"50%"} --><div class="wp-block-column" style="flex-basis:50%">'
					. $this->channel_loop( [], [ $spacer, ...$offset_post ], 2 )
					. '</div><!-- /wp:column -->'
					. '</div><!-- /wp:columns -->'
					. '</div><!-- /wp:group -->',
				),
				'title'      => __( 'Channel Content: Offset', 'wp-curate' ),
			],
		);
	}

	/**
	 * A Channel Content block.
	 *
	 * @param string $inner Serialized inner blocks.
	 * @return string
	 */
	private function channel_content( string $inner ): string {
		return get_comment_delimited_block_content( 'wp-curate/channel-content', [], $inner );
	}

	/**
	 * A Channel Loop block with Single Post blocks.
	 *
	 * @param mixed[] $attrs    Attributes of the Channel Loop other than its template.
	 * @param mixed[] $template The template of the Single Post blocks, in the shape of the editor's
	 *                          `InnerBlockTemplate`.
	 * @param int     $count    The number of Single Post blocks.
	 * @return string
	 */
	private function channel_loop( array $attrs, array $template, int $count ): string {
		$attrs['template'] = $template;

		$single_posts = str_repeat(
			get_comment_delimited_block_content( 'wp-curate/single-post', [], '' ),
			$count,
		);

		return get_comment_delimited_block_content( 'wp-curate/channel-loop', $attrs, $single_posts );
	}
}
