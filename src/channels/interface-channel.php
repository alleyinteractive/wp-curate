<?php
/**
 * Channel interface file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

/**
 * An ordered set of posts or terms that individual blocks can take items from.
 * Individual blocks subscribe to a channel.
 *
 * A block can give its channel arguments, like the `args` of a block binding, such as the term of a
 * channel of the posts in a term. The block saves them in the `args` of its `channel` attribute.
 * The channel reads them, and describes them in `args()` so that the editor can show a control for
 * each one.
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
	 * The arguments that the channel reads, keyed by argument name, like the `args` of a REST API
	 * route.
	 *
	 * An argument name is a key in the block's `args`, and it cannot be a number. Each argument has a
	 * `label`. An argument with `required` set to true is one that the channel needs. The editor
	 * shows a control for an argument only if a script adds one to the slot of the Channel panel. The
	 * script finds the arguments of its own channels by the channel name and the argument name. An
	 * argument can have more keys for that script.
	 *
	 * The channel has no IDs until a block gives it a value for each required argument.
	 *
	 * @phpstan-return array<string, array{label: string, ...<string, mixed>}>
	 *
	 * @return array[]
	 */
	public function args(): array;

	/**
	 * Names of the block context values that the channel reads.
	 *
	 * A block with the `wp-curate/channels` support has the `postId` and `postType` context of the
	 * block around it, or else of the post. A REST API request gives the values as strings.
	 *
	 * @return string[]
	 */
	public function uses_context(): array;

	/**
	 * Whether a block with the context can select the channel.
	 *
	 * The editor lists only the channels that are available. A block can keep a channel after it
	 * moves to where the channel is not available, so the channel must give IDs for any context,
	 * such as none.
	 *
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return bool
	 */
	public function available( array $context ): bool;

	/**
	 * Whether a user can read the channel.
	 *
	 * @param int $user_id User ID, or 0 for a visitor who is not logged in.
	 * @return bool
	 */
	public function can_read( int $user_id ): bool;

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
	 * IDs in the channel, in channel order, and the number of them. With a search, only the IDs
	 * that match it, still in channel order.
	 *
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @param string  $search  Search terms, or an empty string for every ID.
	 * @return Channel_IDs No IDs if the arguments and context do not make a channel.
	 */
	public function ids( array $args, array $context, string $search ): Channel_IDs;
}
