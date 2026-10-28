<?php
/**
 * Default_Channel class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

/**
 * The channel that blocks use when nothing else gives them one.
 *
 * The preferred channel is the default while it is registered. Otherwise, the first registered
 * channel is. This channel passes each call to that channel, and has its name, so that a block
 * without a channel shares a queue with the blocks that name it.
 *
 * A channel that reads arguments or block context cannot be the default. Only a block can give it
 * arguments, and the default applies to blocks in any context.
 *
 * With no channels registered, there is no default, and this channel is empty: its name and
 * labels are empty strings, it has no IDs, it is never available, and no user can read it. That
 * case will be handled later.
 */
final readonly class Default_Channel implements Channel {
	/**
	 * Constructor.
	 *
	 * @param Registered_Channels $channels  Available channels.
	 * @param string              $preferred Name of the preferred default channel.
	 */
	public function __construct(
		private Registered_Channels $channels,
		private string $preferred,
	) {}

	/**
	 * Machine name of the default channel.
	 *
	 * @return string
	 */
	public function name(): string {
		return $this->channel()?->name() ?? '';
	}

	/**
	 * Human-readable name of the default channel.
	 *
	 * @return string
	 */
	public function label(): string {
		return $this->channel()?->label() ?? '';
	}

	/**
	 * The core-data entity kind of the default channel's IDs.
	 *
	 * @return string
	 */
	public function entity_kind(): string {
		return $this->channel()?->entity_kind() ?? '';
	}

	/**
	 * The arguments that the default channel reads: none, because a channel that reads arguments
	 * cannot be the default.
	 *
	 * @phpstan-return array<string, array{label: string, ...<string, mixed>}>
	 *
	 * @return array[]
	 */
	public function args(): array {
		return [];
	}

	/**
	 * Names of the block context values that the default channel reads: none, because a channel
	 * that reads block context cannot be the default.
	 *
	 * @return string[]
	 */
	public function uses_context(): array {
		return [];
	}

	/**
	 * Whether a block with the context can select the default channel.
	 *
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return bool
	 */
	public function available( array $context ): bool {
		return $this->channel()?->available( $context ) ?? false;
	}

	/**
	 * Whether a user can read the default channel.
	 *
	 * @param int $user_id User ID, or 0 for a visitor who is not logged in.
	 * @return bool
	 */
	public function can_read( int $user_id ): bool {
		return $this->channel()?->can_read( $user_id ) ?? false;
	}

	/**
	 * Human-readable name of the default channel's order.
	 *
	 * @return string
	 */
	public function order_label(): string {
		return $this->channel()?->order_label() ?? '';
	}

	/**
	 * Direction of the default channel's order: `asc` or `desc`.
	 *
	 * @return string
	 */
	public function order_direction(): string {
		return $this->channel()?->order_direction() ?? 'desc';
	}

	/**
	 * IDs in the default channel, in channel order.
	 *
	 * @phpstan-return iterable<int>
	 *
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return iterable Integer IDs.
	 */
	public function ids( array $args, array $context ): iterable {
		return $this->channel()?->ids( $args, $context ) ?? [];
	}

	/**
	 * IDs in the default channel that match a search, in channel order.
	 *
	 * @phpstan-return iterable<int>
	 *
	 * @param string  $search  Search terms.
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return iterable Integer IDs.
	 */
	public function ids_matching( string $search, array $args, array $context ): iterable {
		return $this->channel()?->ids_matching( $search, $args, $context ) ?? [];
	}

	/**
	 * Number of IDs in the default channel.
	 *
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return int
	 */
	public function total( array $args, array $context ): int {
		return $this->channel()?->total( $args, $context ) ?? 0;
	}

	/**
	 * Number of IDs in the default channel that match a search.
	 *
	 * @param string  $search  Search terms.
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return int
	 */
	public function total_matching( string $search, array $args, array $context ): int {
		return $this->channel()?->total_matching( $search, $args, $context ) ?? 0;
	}

	/**
	 * The registered channel that is the default: the preferred channel, or else the first one
	 * that can be the default.
	 *
	 * @return Channel|null The channel, or null if no registered channel can be the default.
	 */
	private function channel(): ?Channel {
		$preferred = null;
		$first     = null;

		foreach ( $this->channels->all() as $channel ) {
			if ( [] === $channel->args() && [] === $channel->uses_context() ) {
				$first ??= $channel;

				if ( $this->preferred === $channel->name() ) {
					$preferred = $channel;
				}
			}
		}

		return $preferred ?? $first;
	}
}
