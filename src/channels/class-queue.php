<?php
/**
 * Queue class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

use Generator;

/**
 * The queue of available IDs in a channel.
 *
 * The channel's IDs are read only as far as the blocks on a page need them.
 * This class is mutable, one per channel per request.
 */
final class Queue {
	/**
	 * Removed IDs, as keys.
	 *
	 * @var bool[]
	 */
	private array $removed = [];

	/**
	 * The channel's IDs, or null before they are needed.
	 *
	 * @var Generator|null
	 */
	private ?Generator $ids = null;

	/**
	 * Constructor.
	 *
	 * @param Channel $channel The channel to take IDs from.
	 * @param mixed[] $context The block context values that the channel uses.
	 */
	public function __construct(
		private readonly Channel $channel,
		private readonly array $context,
	) {}

	/**
	 * Returns the next ID and keeps it in the queue.
	 *
	 * @return int|null The ID, or null when no IDs remain.
	 */
	public function top(): ?int {
		$ids = $this->ids();

		// Skip removed IDs and IDs that are not positive integers.
		while ( $ids->valid() && ( $this->current_id() <= 0 || isset( $this->removed[ $this->current_id() ] ) ) ) {
			$ids->next();
		}

		$top = null;

		if ( $ids->valid() ) {
			$top = $this->current_id();
		}

		return $top;
	}

	/**
	 * Removes an ID wherever it sits. This does not read the channel.
	 *
	 * @param int $id Post or term ID.
	 */
	public function remove( int $id ): void {
		$this->removed[ $id ] = true;
	}

	/**
	 * Takes every remaining ID and empties the queue.
	 *
	 * @return int[] Remaining IDs.
	 */
	public function take_rest(): array {
		$taken = [];
		$ids   = $this->ids();

		while ( $ids->valid() ) {
			$id = $this->current_id();

			if ( $id > 0 && ! isset( $this->removed[ $id ] ) ) {
				$taken[]              = $id;
				$this->removed[ $id ] = true;
			}

			$ids->next();
		}

		return $taken;
	}

	/**
	 * The ID that the generator points to now.
	 *
	 * @return int The ID, or 0 when the value is not an integer.
	 */
	private function current_id(): int {
		$current = $this->ids()->current();
		$id      = 0;

		if ( is_int( $current ) ) {
			$id = $current;
		}

		return $id;
	}

	/**
	 * A generator that reads channel IDs one by one.
	 *
	 * @return Generator
	 */
	private function ids(): Generator {
		if ( null === $this->ids ) {
			// Wrap the iterable so that arrays and generators behave alike.
			$this->ids = ( fn () => yield from $this->channel->ids( $this->context ) )();
		}

		return $this->ids;
	}
}
