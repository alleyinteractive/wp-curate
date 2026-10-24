<?php
/**
 * Channel interface file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

/**
 * An ordered set of posts or terms that individual blocks can take items from.
 * Individual blocks subscribe to a channel.
 */
interface Channel {
	/**
	 * Machine name that blocks use to name the channel.
	 *
	 * @return string
	 */
	public function name(): string;

	/**
	 * Human-readable name of the channel, such as "All Topics".
	 *
	 * @return string
	 */
	public function label(): string;

	/**
	 * The core-data entity kind of the channel's IDs, e.g. `postType` for posts or `taxonomy` for terms.
	 *
	 * @return string
	 */
	public function entity_kind(): string;

	/**
	 * Names of the block context values that the channel reads.
	 *
	 * @return string[]
	 */
	public function uses_context(): array;

	/**
	 * Human-readable name of the channel order, such as "Most recent article".
	 *
	 * @return string
	 */
	public function order_label(): string;

	/**
	 * Direction of the channel order: `asc` or `desc`.
	 *
	 * For example, a channel of the most recent articles first is in `desc` order.
	 *
	 * @return string
	 */
	public function order_direction(): string;

	/**
	 * IDs in the channel, in channel order.
	 *
	 * An implementation can return an array or yield IDs from a generator. A caller that needs
	 * only some IDs stops iterating when it has enough.
	 *
	 * @phpstan-return iterable<int>
	 *
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return iterable Integer IDs. Empty if the context does not make a channel.
	 */
	public function ids( array $context ): iterable;
}
