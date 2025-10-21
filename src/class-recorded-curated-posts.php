<?php
/**
 * Recorded_Curated_Posts class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

use Alley\WP\WP_Curate\Post_IDs\History;
use WP_Block_Type;

/**
 * Record the post IDs used as context.
 */
final class Recorded_Curated_Posts implements Curated_Posts {
	/**
	 * New Curated_Posts instance.
	 *
	 *
	 * @param Curated_Posts The curated_posts inside the template block to set as context.
	 */
	private Curated_Posts $modified_curated_posts;

	/**
	 * Set up.
	 *
	 * @param History       $history Post IDs to record history to.
	 * @param Curated_Posts $origin  The curated posts.
	 */
	public function __construct(
		private readonly History $history,
		private readonly Curated_Posts $origin,
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
		// var_dump( $this->origin );
		$post_ids = $this->origin->get_post_ids_envelope()->to_array();
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

	/**
	 * Populate query block context from curation fields.
	 *
	 * @param array<string, mixed> $context    Query block context.
	 * @param array<string, mixed> $attributes Curation field settings.
	 * @param WP_Block_Type        $block_type Block type.
	 * @return array{"query": array<string, mixed>} Updated context.
	 */
	public function with_query_context( array $context, array $attributes, WP_Block_Type $block_type ): array {
		$context = $this->origin->with_query_context( $context, $attributes, $block_type );

		if ( isset( $context['query']['include'] ) && is_array( $context['query']['include'] ) ) {
			// $this->assign_post_ids();

			$this->history->record( $context['query']['include'] );
			$context['allPostIds'] = $context['query']['include'];
			// $context['query']['include'] = $this->modified_curated_posts;
		}

		return $context;
	}
}
