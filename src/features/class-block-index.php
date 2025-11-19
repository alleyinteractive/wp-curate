<?php
/**
 * Block_Index class file.
 *
 * @package WP_Curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;

/**
 * Assign an index attribute to Post blocks inside a Query block.
 */
final class Block_Index implements Feature {
	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		// Register block patterns feature.
		add_filter( 'render_block_data', [ $this, 'assign_post_index' ], 10, 2 );
		add_filter( 'render_block_context', [ $this, 'set_post_in_context' ], 10, 2 );
		add_filter( 'render_block_context', [ $this, 'adjust_query_block_context' ], 20, 2 );
	}

	/**
	 * Assign an index attribute to Post blocks inside a Query block.
	 *
	 * @param array $block_data The block data.
	 * @param array $block The block.
	 * @return array The modified block data.
	 */
	public function assign_post_index( array $block_data, array $block ): array {
		if ( 'wp-curate/query' === $block_data['blockName'] ) {
			// Find the wp-curate/post blocks inside the query block.
			$inner_blocks = $block_data['innerBlocks'];
			$post_blocks  = [];
			$this->recursively_find_blocks( $inner_blocks, 'wp-curate/post', $post_blocks );
			if ( empty( $post_blocks ) ) {
				return $block_data;
			}
			$post_index      = 0;
			$number_of_posts = $block_data['attrs']['numberOfPosts'] ?? 5;
			if ( 0 === $number_of_posts ) {
				return $block_data;
			}
			$new_blocks                = $this->assign_index_recursively(
				$inner_blocks,
				$post_index,
				$block_data['blockName'],
				$number_of_posts - count( $post_blocks ),
			);
			$block_data['innerBlocks'] = $new_blocks;
		}
		return $block_data;
	}

	/**
	 * Recursively assign index to post blocks.
	 *
	 * @param array  $blocks The blocks to process.
	 * @param int    $post_index The current post index.
	 * @param string $parent_block_name The name of the parent block.
	 * @param int    $number_of_template_posts The number of posts in the template.
	 * @return array The updated blocks.
	 */
	private function assign_index_recursively(
		array $blocks,
		int &$post_index,
		string $parent_block_name,
		int $number_of_template_posts = 0,
	): array {
		$new_blocks = [];
		foreach ( $blocks as $block ) {
			if ( 'wp-curate/post' === $block['blockName'] ) {
				$offset                  = 'core/post-template' === $parent_block_name ? $number_of_template_posts : 1;
				$block['attrs']['index'] = $post_index;
				$post_index             += $offset;
			}
			// Recursively assign index to inner blocks.
			$block['innerBlocks'] = $this->assign_index_recursively(
				$block['innerBlocks'],
				$post_index,
				$block['blockName'],
				$number_of_template_posts,
			);
			$new_blocks[]         = $block;
		}
		return $new_blocks;
	}

	/**
	 * Recursively find all blocks with desired block name that aren't inside a post-template block.
	 *
	 * @param array             $blocks The blocks to search.
	 * @param string[] | string $block_name The name of the block to search for.
	 * @param array             $found_blocks The found post blocks.
	 */
	private function recursively_find_blocks( array $blocks, array|string $block_name, array &$found_blocks ): void {
		if ( is_string( $block_name ) ) {
			$block_name = [ $block_name ];
		}
		foreach ( $blocks as $block ) {
			if ( in_array( $block['blockName'], $block_name, true ) ) {
				$found_blocks[] = $block;
			}
			// Recursively search inner blocks.
			if ( 'core/post-template' !== $block['blockName'] ) {
				$this->recursively_find_blocks( $block['innerBlocks'], $block_name, $found_blocks );
			}
		}
	}

	/**
	 * Sets the post ID in the block context for wp-curate/post blocks.
	 *
	 * @param array $block_context The block context.
	 * @param array $block The block.
	 * @return array The modified block context.
	 */
	public function set_post_in_context( array $block_context, array $block ): array {
		if ( 'wp-curate/post' === $block['blockName'] ) {
			$index                   = $block['attrs']['index'] ?? null;
			$post_id                 = $block_context['allPostIds'][ $index ] ?? null;
			$block_context['postId'] = $post_id;
		}
		return $block_context;
	}

	/**
	 * Adjust the query block context to account for post blocks outside of post-template blocks.
	 *
	 * @param array $block_context The block context.
	 * @param array $block The block.
	 * @return array The modified block context.
	 */
	public function adjust_query_block_context( array $block_context, array $block ): array {
		if ( 'wp-curate/query' === $block['blockName'] ) {
			$inner_blocks            = $block['innerBlocks'];
			$post_or_template_blocks = [];
			$this->recursively_find_blocks( $inner_blocks, [ 'wp-curate/post', 'core/post-template' ], $post_or_template_blocks );
			if ( empty( $post_or_template_blocks ) ) {
				return $block_context;
			}
			$post_blocks = array_filter(
				$post_or_template_blocks,
				function ( $block ) {
					return 'wp-curate/post' === $block['blockName'];
				}
			);
			if ( empty( $post_blocks ) ) {
				return $block_context;
			}
			$post_index      = 0;
			$number_of_posts = $block['attrs']['numberOfPosts'] ?? 5;
			if ( 0 === $number_of_posts ) {
				return $block_context;
			}
			$include                     = $block_context['query']['include'] ?? [];
			$block_context['allPostIds'] = $include;
			$new_include                 = [];
			foreach ( $post_or_template_blocks as $post_or_template_block ) {
				if ( 'wp-curate/post' === $post_or_template_block['blockName'] ) {
					array_shift( $include );
				} elseif ( 'core/post-template' === $post_or_template_block['blockName'] ) {
					$offset = $number_of_posts - count( $post_blocks );
					for ( $i = 0; $i < $offset; $i++ ) {
						$new_include[] = array_shift( $include );
					}
				} else {
					continue;
				}
			}
			$block_context['query']['include'] = $new_include;
		}
		return $block_context;
	}
}
