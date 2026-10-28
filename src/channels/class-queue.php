<?php
/**
 * Queue class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

use Alley\WP\Types\Post_IDs;
use Generator;

/**
 * The queue of available IDs in a channel.
 *
 * The channel's IDs are read only as far as the blocks on a page need them, and kept, so that an
 * ID that one block skips stays available to the blocks after it. This class is mutable, one per
 * channel per request.
 */
final class Queue {
	/**
	 * Removed IDs, as keys.
	 *
	 * @var bool[]
	 */
	private array $removed = [];

	/**
	 * The IDs read from the channel so far, in channel order.
	 *
	 * @var int[]
	 */
	private array $read = [];

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
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context The block context values that the channel uses.
	 */
	public function __construct(
		private readonly Channel $channel,
		private readonly array $args,
		private readonly array $context,
	) {}

	/**
	 * Returns the next ID and keeps it in the queue.
	 *
	 * @param Post_IDs $skipped IDs to pass over, which stay in the queue.
	 * @return int|null The ID, or null when no IDs remain.
	 */
	public function top( Post_IDs $skipped ): ?int {
		$skipped = array_flip( $skipped->post_ids() );
		$index   = 0;
		$top     = null;

		while ( null === $top && $this->has_read( $index ) ) {
			$id = $this->read[ $index ];

			if ( ! isset( $this->removed[ $id ] ) && ! isset( $skipped[ $id ] ) ) {
				$top = $id;
			}

			++$index;
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

		// Read the whole channel.
		do {
			$has_more = $this->read_next();
		} while ( $has_more );

		foreach ( $this->read as $id ) {
			if ( ! isset( $this->removed[ $id ] ) ) {
				$taken[]              = $id;
				$this->removed[ $id ] = true;
			}
		}

		return $taken;
	}

	/**
	 * Whether the IDs read so far reach a position, reading the next ID from the channel if needed.
	 *
	 * @param int $index Position in the IDs read so far.
	 * @return bool
	 */
	private function has_read( int $index ): bool {
		return $index < count( $this->read ) || $this->read_next();
	}

	/**
	 * Reads the channel's next ID that is a positive integer into the IDs read so far.
	 *
	 * @return bool Whether an ID was read.
	 */
	private function read_next(): bool {
		$ids  = $this->ids();
		$read = false;

		while ( ! $read && $ids->valid() ) {
			$current = $ids->current();

			if ( is_int( $current ) && $current > 0 ) {
				$this->read[] = $current;
				$read         = true;
			}

			$ids->next();
		}

		return $read;
	}

	/**
	 * A generator that reads channel IDs one by one.
	 *
	 * @return Generator
	 */
	private function ids(): Generator {
		if ( null === $this->ids ) {
			// Wrap the iterable so that arrays and generators behave alike.
			$this->ids = ( fn () => yield from $this->channel->ids( $this->args, $this->context, '' )->ids() )();
		}

		return $this->ids;
	}
}
