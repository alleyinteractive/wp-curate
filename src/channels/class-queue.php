<?php
/**
 * Queue class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

use Generator;

/**
 * The queue of IDs in a channel, which blocks take from the top in order.
 *
 * The channel's IDs are loaded only to the extent that the blocks on a page need them.
 *
 * This class is mutable, one per channel per request.
 */
final class Queue {
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
	 * Removes the next ID from the queue and returns it.
	 *
	 * @return int|null The ID, or null when no IDs remain.
	 */
	public function take(): ?int {
		$ids = $this->ids();
		$top = null;

		while ( null === $top && $ids->valid() ) {
			$current = $ids->current();

			if ( is_int( $current ) && $current > 0 ) {
				$top = $current;
			}

			$ids->next();
		}

		return $top;
	}

	/**
	 * A generator that reads channel IDs one by one.
	 *
	 * @return Generator
	 */
	private function ids(): Generator {
		if ( null === $this->ids ) {
			// Wrap the iterable so that arrays and generators behave alike.
			$this->ids = ( fn () => yield from $this->channel->results( $this->args, $this->context, '' )->ids() )();
		}

		return $this->ids;
	}
}
