<?php
/**
 * Empty_Channel_IDs class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

/**
 * No IDs, such as from a channel that a block has not given its required arguments.
 */
final readonly class Empty_Channel_IDs implements Channel_IDs {
	/**
	 * IDs: none.
	 *
	 * @phpstan-return iterable<int>
	 *
	 * @return iterable Integer IDs.
	 */
	public function ids(): iterable {
		return [];
	}

	/**
	 * Number of IDs: 0.
	 *
	 * @return int
	 */
	public function total(): int {
		return 0;
	}
}
