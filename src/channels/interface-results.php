<?php
/**
 * Results interface file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

/**
 * The IDs that a channel gives for a block's arguments, context, and search.
 */
interface Results {
	/**
	 * IDs in channel order.
	 *
	 * @phpstan-return iterable<int>
	 *
	 * @return iterable Integer IDs.
	 */
	public function ids(): iterable;

	/**
	 * Total number of IDs in the results.
	 *
	 * @return int
	 */
	public function total(): int;
}
