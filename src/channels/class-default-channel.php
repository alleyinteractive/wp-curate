<?php
/**
 * Default_Channel class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

/**
 * The channel that blocks fall back to.
 *
 * The preferred channel is the default while it is registered. Otherwise, the first registered
 * channel is. With no channels registered, there is no default, and the channel is empty.
 */
final readonly class Default_Channel implements Channel {
	/**
	 * Constructor.
	 *
	 * @param Available_Channels $channels  Available channels.
	 * @param string             $preferred Name of the preferred default channel.
	 */
	public function __construct(
		private Available_Channels $channels,
		private string $preferred,
	) {}

	/**
	 * Machine name that blocks use to name the channel.
	 *
	 * @return string
	 */
	public function name(): string {
		return $this->channel()?->name() ?? '';
	}

	/**
	 * Human-readable name of the channel, such as "All Topics".
	 *
	 * @return string
	 */
	public function label(): string {
		return $this->channel()?->label() ?? '';
	}

	/**
	 * The core-data entity kind of the channel's IDs, e.g. `postType` for posts or `taxonomy` for terms.
	 *
	 * @return string
	 */
	public function entity_kind(): string {
		return $this->channel()?->entity_kind() ?? '';
	}

	/**
	 * The arguments that the channel reads, keyed by argument name, like the `args` of a REST API route.
	 *
	 * @phpstan-return array<string, array{label: string, ...<string, mixed>}>
	 *
	 * @return array[]
	 */
	public function args(): array {
		return [];
	}

	/**
	 * Names of the block context values that the channel reads in order to supply posts.
	 *
	 * @return string[]
	 */
	public function uses_context(): array {
		return [];
	}

	/**
	 * Whether a block with the given context can use the channel.
	 *
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return bool
	 */
	public function eligible( array $context ): bool {
		return $this->channel()?->eligible( $context ) ?? false;
	}

	/**
	 * Whether a user can read the channel.
	 *
	 * @param int $user_id User ID.
	 * @return bool
	 */
	public function can_read( int $user_id ): bool {
		return $this->channel()?->can_read( $user_id ) ?? false;
	}

	/**
	 * IDs in the channel, in channel order, and the number of them.
	 *
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @param string  $search  Search terms, or an empty string for every ID.
	 * @return Results No IDs if the arguments and context do not make a channel.
	 */
	public function results( array $args, array $context, string $search ): Results {
		return $this->channel()?->results( $args, $context, $search ) ?? new Empty_Results();
	}

	/**
	 * The registered channel that is the default: the preferred channel, or else the first one
	 * that can be the default.
	 *
	 * @return Channel|null The channel, or null if no registered channel can be the default.
	 */
	private function channel(): ?Channel {
		$match = null;
		$first = null;

		/**
		 * Filters the name of the preferred default channel.
		 *
		 * @param string $preferred Name of the preferred default channel.
		 */
		$preferred = apply_filters( 'wp_curate_preferred_default_channel', $this->preferred );

		if ( ! is_string( $preferred ) ) {
			$preferred = $this->preferred;
		}

		foreach ( $this->channels->all() as $channel ) {
			if ( [] === $channel->args() && [] === $channel->uses_context() ) {
				$first ??= $channel;

				if ( $channel->name() === $preferred ) {
					$match = $channel;
				}
			}
		}

		return $match ?? $first;
	}
}
