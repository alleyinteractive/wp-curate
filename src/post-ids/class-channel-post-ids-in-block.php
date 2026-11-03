<?php
/**
 * Channel_Post_IDs_In_Block class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Post_IDs;

use Alley\WP\Types\Post_IDs;
use WP_Block;
use WP_Block_Type;
use WP_Block_Type_Registry;

/**
 * The posts that the channel blocks inside a block took from their queues, such as the Single Post
 * blocks inside a Channel Content block, in document order.
 *
 * Read the IDs after the inner blocks render. Before then, the channel blocks have no posts. Like
 * `Channel_Block_Support`, a channel block is a block with `wp-curate/channels` support that does not
 * provide the `wp-curate/channel` context.
 */
final readonly class Channel_Post_IDs_In_Block implements Post_IDs {
	/**
	 * Constructor.
	 *
	 * @param WP_Block               $block               The block.
	 * @param WP_Block_Type_Registry $block_type_registry Core block type registry.
	 */
	public function __construct(
		private WP_Block $block,
		private WP_Block_Type_Registry $block_type_registry,
	) {}

	/**
	 * Post IDs.
	 *
	 * @return int[]
	 */
	public function post_ids(): array {
		return $this->post_ids_in( $this->block->inner_blocks );
	}

	/**
	 * The posts that the channel blocks in a list of blocks and their inner blocks took.
	 *
	 * The blocks inside a channel block show its post, so a channel block without a post shows
	 * nothing, and the blocks inside it do not count.
	 *
	 * @phpstan-param iterable<mixed> $blocks
	 *
	 * @param iterable $blocks The blocks. `WP_Block::$inner_blocks` is a `WP_Block_List`, or an empty
	 *                         array when the block has no inner blocks.
	 * @return int[]
	 */
	private function post_ids_in( iterable $blocks ): array {
		$out = [];

		foreach ( $blocks as $inner ) {
			if ( ! $inner instanceof WP_Block ) {
				continue;
			}

			if ( $this->is_channel_block( $inner ) ) {
				if ( isset( $inner->context['postId'] ) && is_int( $inner->context['postId'] ) && $inner->context['postId'] > 0 ) {
					$out[] = $inner->context['postId'];
				}
			} else {
				$out = array_merge( $out, $this->post_ids_in( $inner->inner_blocks ) );
			}
		}

		return $out;
	}

	/**
	 * Whether a block takes a post from a channel.
	 *
	 * @param WP_Block $block The block.
	 * @return bool
	 */
	private function is_channel_block( WP_Block $block ): bool {
		// A block that is not registered has no block type.
		$block_type = $this->block_type_registry->get_registered( $block->name );

		return $block_type instanceof WP_Block_Type
			&& block_has_support( $block_type, 'wp-curate/channels' )
			&& ! isset( $block_type->provides_context['wp-curate/channel'] );
	}
}
