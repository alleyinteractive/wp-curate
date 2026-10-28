<?php
/**
 * Pinned_In_Channel_Blocks class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Post_IDs;

use Alley\WP\Types\Post_IDs;
use WP_Block_Processor;
use WP_Block_Type;
use WP_Block_Type_Registry;

/**
 * Post IDs that the channel blocks in the given content pin with their `ref` attribute.
 *
 * Keep the rules matched with `useChannelQueue()`.
 */
final readonly class Pinned_In_Channel_Blocks implements Post_IDs {
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
		$out = [];

		$proc = new WP_Block_Processor( $this->content );

		while ( $proc->next_block() ) {
			$type = $proc->get_block_type();

			if ( is_string( $type ) ) {
				$type_obj = $this->block_type_registry->get_registered( $type );

				if (
					$type_obj instanceof WP_Block_Type
					&& block_has_support( $type_obj, 'wp-curate/channel' )
					// Exclude blocks that provide a channel as context.
					&& ! isset( $type_obj->provides_context['wp-curate/channel'] )
				) {
					$attrs = $proc->allocate_and_return_parsed_attributes();

					if (
						is_array( $attrs )
						&& isset( $attrs['ref'] )
						&& is_int( $attrs['ref'] )
						&& $attrs['ref'] > 0
					) {
						$out[] = $attrs['ref'];
					}
				}
			}
		}

		return $out;
	}
}
