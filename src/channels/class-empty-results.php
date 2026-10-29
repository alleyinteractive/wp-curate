<?php
/**
 * Empty_Results class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

/**
 * No IDs, such as from a channel that a block has not given its required arguments.
 */
final readonly class Empty_Results implements Results {
	/**
	 * IDs in channel order.
	 *
	 * @phpstan-return iterable<int>
	 *
	 * @return iterable Integer IDs.
	 */
	public function ids(): iterable {
		return [];
	}

	/**
	 * Total number of IDs in the results.
	 *
	 * @return int
	 */
	public function total(): int {
		return 0;
	}
}
