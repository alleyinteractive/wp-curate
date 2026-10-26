<?php
/**
 * Channel_Queues class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

/**
 * The queues that blocks share during a request.
 *
 * A block names its channel. Each channel gets a separate queue for each context value that it
 * uses. Blocks take IDs in render order. Keep these rules matched with `useChannelQueue()`.
 */
final class Channel_Queues {
	/**
	 * Queues that exist so far, keyed by channel and context.
	 *
	 * @var Queue[]
	 */
	private array $queues = [];

	/**
	 * Constructor.
	 *
	 * @param Registered_Channels $channels Available channels.
	 */
	public function __construct(
		private readonly Registered_Channels $channels,
	) {}

	/**
	 * Takes the ref from a block or else the next queued ID. Then removes the ID from the queue.
	 *
	 * @param string  $name    Channel name that the block uses.
	 * @param int     $ref     Pinned ID, or 0.
	 * @param mixed[] $context Block context.
	 * @return int|null The ID, or null when none remains.
	 */
	public function take_one( string $name, int $ref, array $context ): ?int {
		$queue = $this->queue( $name, $context );
		$taken = null;

		if ( $ref > 0 ) {
			$taken = $ref;
		}

		if ( null === $taken && $queue instanceof Queue ) {
			$taken = $queue->top();
		}

		if ( null !== $taken && $queue instanceof Queue ) {
			$queue->remove( $taken );
		}

		return $taken;
	}

	/**
	 * Takes every remaining ID.
	 *
	 * @param string  $name    Channel name that the block uses.
	 * @param mixed[] $context Block context.
	 * @return int[] Remaining IDs.
	 */
	public function take_rest( string $name, array $context ): array {
		$queue = $this->queue( $name, $context );
		$taken = [];

		if ( $queue instanceof Queue ) {
			$taken = $queue->take_rest();
		}

		return $taken;
	}

	/**
	 * Finds or creates the queue that matches the channel and the context that it uses.
	 *
	 * @param string  $name    Channel name.
	 * @param mixed[] $context Block context.
	 * @return Queue|null The queue, or null when no channel has the name.
	 */
	private function queue( string $name, array $context ): ?Queue {
		$found = null;

		foreach ( $this->channels->all() as $channel ) {
			if ( $channel->name() === $name ) {
				$used = array_intersect_key( $context, array_flip( $channel->uses_context() ) );
				$key  = wp_json_encode( [ $name, $used ] );

				if ( is_string( $key ) ) {
					$this->queues[ $key ] ??= new Queue( $channel, $used );
					$found                  = $this->queues[ $key ];
				}

				break;
			}
		}

		return $found;
	}
}
