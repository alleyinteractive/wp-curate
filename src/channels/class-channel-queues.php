<?php
/**
 * Channel_Queues class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

use Alley\WP\Types\Post_IDs;
use Alley\WP\WP_Curate\Post_IDs\Post_IDs_Taken_From_Channels;

/**
 * The queues that blocks share during a request.
 *
 * A block names its channel. Each channel gets a separate queue for each set of arguments and
 * context values that it uses. Blocks take IDs in render order, and each block can skip more IDs,
 * such as by its post's deduplication rule. Keep these rules matched with `useChannelQueue()`.
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
	 * @param Registered_Channels          $channels Available channels.
	 * @param Post_IDs_Taken_From_Channels $taken    The record of the IDs that blocks take from any queue.
	 */
	public function __construct(
		private readonly Registered_Channels $channels,
		private readonly Post_IDs_Taken_From_Channels $taken,
	) {}

	/**
	 * Takes the ref from a block or else the next queued ID that the block does not skip. Then
	 * removes the ID from the queue.
	 *
	 * @param string   $name    Channel name that the block uses.
	 * @param int      $ref     Pinned ID, or 0.
	 * @param mixed[]  $args    The block's arguments for the channel.
	 * @param mixed[]  $context Block context.
	 * @param Post_IDs $skipped IDs that the block skips at the top of the queue.
	 * @return int|null The ID, or null when none remains.
	 */
	public function take_one( string $name, int $ref, array $args, array $context, Post_IDs $skipped ): ?int {
		$queue = $this->queue( $name, $args, $context );
		$taken = null;

		if ( $ref > 0 ) {
			$taken = $ref;
		}

		if ( null === $taken && $queue instanceof Queue ) {
			$taken = $queue->top( $skipped );
		}

		if ( null !== $taken && $queue instanceof Queue ) {
			$queue->remove( $taken );
		}

		if ( null !== $taken ) {
			$this->taken->record( $taken );
		}

		return $taken;
	}

	/**
	 * Takes every remaining ID.
	 *
	 * @param string  $name    Channel name that the block uses.
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context Block context.
	 * @return int[] Remaining IDs.
	 */
	public function take_rest( string $name, array $args, array $context ): array {
		$queue = $this->queue( $name, $args, $context );
		$taken = [];

		if ( $queue instanceof Queue ) {
			$taken = $queue->take_rest();
		}

		foreach ( $taken as $id ) {
			$this->taken->record( $id );
		}

		return $taken;
	}

	/**
	 * Finds or creates the queue that matches the channel and the arguments and context that it uses.
	 *
	 * @param string  $name    Channel name.
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context Block context.
	 * @return Queue|null The queue, or null when no channel has the name.
	 */
	private function queue( string $name, array $args, array $context ): ?Queue {
		$found = null;

		foreach ( $this->channels->all() as $channel ) {
			if ( $channel->name() === $name ) {
				/*
				 * A block's arguments can include keys that this channel does not read, such as from
				 * hand-written markup or a field that the channel no longer has. Leaving them out gives
				 * every block that uses the same arguments the same queue.
				 */
				$used_args = array_intersect_key( $args, array_flip( array_column( $channel->arg_fields(), 'id' ) ) );
				$used      = array_intersect_key( $context, array_flip( $channel->uses_context() ) );

				ksort( $used_args );

				$key = wp_json_encode( [ $name, $used_args, $used ] );

				if ( is_string( $key ) ) {
					$this->queues[ $key ] ??= new Queue( $channel, $used_args, $used );
					$found                  = $this->queues[ $key ];
				}

				break;
			}
		}

		return $found;
	}
}
