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
 * The channel reads them, and lists their fields so that the editor can show a control for each
 * one.
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
	 * The arguments that the channel reads, as fields for the editor.
	 *
	 * Each field has an `id`, which is its key in the arguments, a `label`, and a `type`. A type can
	 * need more keys. The editor shows a control for a field only if a script adds one for its type
	 * to the slot of the Channel panel. WP Curate adds a term picker for the `term` type, which
	 * needs a `taxonomy`.
	 *
	 * The channel has no IDs until a block gives it a value for each field.
	 *
	 * @phpstan-return list<array<string, string>>
	 *
	 * @return array[]
	 */
	public function arg_fields(): array;

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
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return iterable Integer IDs. Empty if the arguments and context do not make a channel.
	 */
	public function ids( array $args, array $context ): iterable;

	/**
	 * IDs in the channel that match a search, in channel order.
	 *
	 * Like `ids()`, an implementation can return an array or yield IDs from a generator.
	 *
	 * @phpstan-return iterable<int>
	 *
	 * @param string  $search  Search terms.
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return iterable Integer IDs. Empty if nothing matches.
	 */
	public function ids_matching( string $search, array $args, array $context ): iterable;

	/**
	 * Number of IDs in the channel.
	 *
	 * It counts the same IDs that `ids()` returns.
	 *
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return int Number of IDs. 0 if the arguments and context do not make a channel.
	 */
	public function total( array $args, array $context ): int;

	/**
	 * Number of IDs in the channel that match a search.
	 *
	 * It counts the same IDs that `ids_matching()` returns.
	 *
	 * @param string  $search  Search terms.
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return int Number of IDs. 0 if nothing matches.
	 */
	public function total_matching( string $search, array $args, array $context ): int;
}
