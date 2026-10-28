<?php
/**
 * Channel_IDs interface file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

/**
 * The IDs that a channel gives for a block's arguments, context, and search, and the number of
 * them.
 *
 * The editor pages through a channel by `total()`, so it must count the same IDs that `ids()`
 * gives. An implementation can compute each one only when it is called, so that a caller that needs
 * only the IDs does not count them.
 */
interface Channel_IDs {
	/**
	 * IDs, in channel order.
	 *
	 * An implementation can return an array or yield IDs from a generator. A caller that needs
	 * only some IDs stops iterating when it has enough.
	 *
	 * @phpstan-return iterable<int>
	 *
	 * @return iterable Integer IDs.
	 */
	public function ids(): iterable;

	/**
	 * Number of IDs that `ids()` gives.
	 *
	 * @return int
	 */
	public function total(): int;
}
