<?php
/**
 * Channel_Posts_In_Block class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

use WP_Block;
use WP_Block_Type;
use WP_Block_Type_Registry;
use WP_HTML_Tag_Processor;

/**
 * Whether the inner channel blocks inside a block show a post, such as the Single Post blocks inside a
 * Channel Content block.
 */
final readonly class Channel_Posts_In_Block {
	/**
	 * Constructor.
	 *
	 * @param WP_Block               $block               The block.
	 * @param string                 $content             The rendered inner blocks of the block.
	 * @param WP_Block_Type_Registry $block_type_registry Core block type registry.
	 */
	public function __construct(
		private WP_Block $block,
		private string $content,
		private WP_Block_Type_Registry $block_type_registry,
	) {}

	/**
	 * Whether a channel block inside the block shows a post.
	 *
	 * @return bool
	 */
	public function exist(): bool {
		if ( $this->exist_in( $this->block->inner_blocks ) ) {
			return true;
		}

		$processor = new WP_HTML_Tag_Processor( $this->content );

		return $processor->next_tag( [ 'class_name' => 'wp-block-wp-curate-channel-template' ] );
	}

	/**
	 * Whether a channel block in a list of blocks and their inner blocks took a post. Stops at the
	 * first post.
	 *
	 * The blocks inside a channel block show its post, so a channel block without a post shows
	 * nothing, and the blocks inside it do not count.
	 *
	 * @phpstan-param iterable<mixed> $blocks
	 *
	 * @param iterable $blocks The blocks. `WP_Block::$inner_blocks` is a `WP_Block_List`, or an empty
	 *                         array when the block has no inner blocks.
	 * @return bool
	 */
	private function exist_in( iterable $blocks ): bool {
		foreach ( $blocks as $inner ) {
			if ( ! $inner instanceof WP_Block ) {
				continue;
			}

			if ( 'wp-curate/channel-template' === $inner->name ) {
				continue;
			}

			if ( $this->is_channel_block( $inner ) ) {
				if ( isset( $inner->context['postId'] ) && is_int( $inner->context['postId'] ) && $inner->context['postId'] > 0 ) {
					return true;
				}
			} elseif ( $this->exist_in( $inner->inner_blocks ) ) {
				return true;
			}
		}

		return false;
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
