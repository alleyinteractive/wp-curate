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
	 * The arguments that the channel accepts, keyed by argument name, like the `args` of a REST API route.
	 *
	 * The channel has no IDs until a block gives it a value for each required argument.
	 *
	 * @phpstan-return array<string, array{label: string, ...<string, mixed>}>
	 *
	 * @return array[]
	 */
	public function args(): array;

	/**
	 * Names of the block context values that the channel reads in order to supply posts.
	 *
	 * @return string[]
	 */
	public function uses_context(): array;

	/**
	 * Whether a block with the given context can use the channel.
	 *
	 * The editor lists only the channels that are eligible. A block can keep a channel after it
	 * moves to where the channel is not eligible, so the channel must give IDs for any context,
	 * such as none.
	 *
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return bool
	 */
	public function eligible( array $context ): bool;

	/**
	 * Whether a user can read the channel.
	 *
	 * @param int $user_id User ID.
	 * @return bool
	 */
	public function can_read( int $user_id ): bool;

	/**
	 * IDs in the channel, in channel order, and the number of them.
	 *
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @param string  $search  Search terms, or an empty string for every ID.
	 * @return Results No IDs if the arguments and context do not make a channel.
	 */
	public function results( array $args, array $context, string $search ): Results;
}
