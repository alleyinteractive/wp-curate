<?php
/**
 * Non_Template_Post_Blocks class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

use WP_Block;

/**
 * Find post blocks that are not in Post Template blocks and assign a post id to them directly.
 */
final class Non_Template_Post_Blocks {
	/**
	 * New Recorded_Curated_Posts instance.
	 *
	 *
	 * @param Recorded_Curated_Posts The recorded curated posts.
	 */
	static Recorded_Curated_Posts $modified_curated_posts;

	/**
	 * Set up.
	 *
	 * @param Recorded_Curated_Posts $recorded_curated_posts The recorded curated posts.
	 * @param WP_Block[]             $inner_blocks           The inner blocks to process.
	 */
	public function __construct(
		private readonly Recorded_Curated_Posts $recorded_curated_posts,
		private readonly array $inner_blocks,
	) {}

	/**
	 * Recursive get all wp-curate/post and core/post-template blocks.
	 *
	 * @param WP_Block[] $blocks The blocks to search.
	 * @return WP_Block[] The found blocks.
	 */
	private function get_post_and_post_template_blocks( array $blocks ): array {
		$found_blocks = [];
		foreach ( $blocks as $block ) {
			if ( 'wp-curate/post' === $block->block_name || 'core/post-template' === $block->block_name ) {
				$found_blocks[] = $block;
			}

			if ( ! empty( $block->inner_blocks ) ) {
				$found_blocks = array_merge(
					$found_blocks,
					$this->get_post_and_post_template_blocks( $block->inner_blocks )
				);
			}
		}
		return $found_blocks;
	}

	/**
	 * Assign post IDs to non-template post blocks and update the modified curated posts.
	 */
	public function assign_post_ids(): void {
		$blocks   = $this->get_post_and_post_template_blocks( $this->inner_blocks );
		$post_ids = $this->recorded_curated_posts->get_post_ids_envelope()->to_array();
		$post_block_count = array_filter(
			$blocks,
			fn( WP_Block $block ) => 'wp-curate/post' === $block->block_name
		).count();
		foreach ( $blocks as $block ) {
			if ( 'wp-curate/post' === $block->block_name && ! isset( $block['attributes']['postId'] ) ) {
				if ( empty( $post_ids ) ) {
					break;
				}
				$block['attributes']['postId'] = array_shift( $post_ids );
			}
			if ( 'core/post-template' === $block->block_name ) {
				// Once we hit a post-template block, we stop assigning post IDs to inner post blocks.
				for ( $i = 0; $i < $post_block_count; $i++ ) {
					self::$modified_curated_posts[] = array_shift( $post_ids );
				}
			}
		}
	}
}
