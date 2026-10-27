<?php
/**
 * Pinned_In_Channel_Blocks class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Post_IDs;

use Alley\WP\Types\Post_IDs;
use WP_Block_Type;
use WP_Block_Type_Registry;

use function Alley\WP\match_blocks;

/**
 * Post IDs that the channel blocks in some content pin with their `ref` attribute.
 *
 * A block that gives its channel to the blocks inside it, like Many Posts, pins nothing. Keep the
 * rules matched with `useChannelQueue()`.
 */
final readonly class Pinned_In_Channel_Blocks implements Post_IDs {
	/**
	 * The block support of a block that has a channel.
	 *
	 * @var string
	 */
	private const SUPPORT = 'wp-curate/channel';

	/**
	 * The block context that a block provides to give its channel to the blocks inside it.
	 *
	 * @var string
	 */
	private const CHANNEL_CONTEXT = 'wp-curate/channel';

	/**
	 * Constructor.
	 *
	 * @param string                 $content             Block content, such as post content.
	 * @param WP_Block_Type_Registry $block_type_registry Core block type registry.
	 */
	public function __construct(
		private string $content,
		private WP_Block_Type_Registry $block_type_registry,
	) {}

	/**
	 * Post IDs.
	 *
	 * @return int[]
	 */
	public function post_ids(): array {
		$pinned_ids = [];

		$blocks = match_blocks(
			$this->content,
			[
				'flatten'    => true,
				'with_attrs' => 'ref',
			],
		);

		if ( ! is_array( $blocks ) ) {
			$blocks = [];
		}

		foreach ( $blocks as $block ) {
			$block_type = null;

			// A freeform block has a null name.
			if ( isset( $block['blockName'] ) ) {
				$block_type = $this->block_type_registry->get_registered( $block['blockName'] );
			}

			if (
				$block_type instanceof WP_Block_Type
				&& block_has_support( $block_type, self::SUPPORT )
				&& ! isset( $block_type->provides_context[ self::CHANNEL_CONTEXT ] )
				&& isset( $block['attrs']['ref'] )
				&& is_int( $block['attrs']['ref'] )
				&& $block['attrs']['ref'] > 0
			) {
				$pinned_ids[] = $block['attrs']['ref'];
			}
		}

		return $pinned_ids;
	}
}
