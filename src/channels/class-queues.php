<?php
/**
 * Queues class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

/**
 * The queues that blocks share during a request.
 *
 * Blocks specify their own channel. Each channel gets a separate queue for each set of arguments and context values
 * that it uses. Blocks take IDs in render order. A block takes its pin, or else the top of its queue. Then the ID is
 * removed from that queue, so the blocks that use the same queue never show the same post twice. The queues do not
 * share IDs, so blocks that use different queues can show the same post. A block always shows its own pin.
 *
 * A block that shows the remaining IDs, like Channel Template, renders one Single Post block at a time while its queue
 * has a `top()`, up to a limit. Each Single Post takes the top of the queue. The blocks after it in the same queue get
 * the IDs past the limit, if any.
 *
 * Keep these rules matched with `useChannelQueue()`.
 */
final class Queues {
	/**
	 * Queues that exist so far, keyed by channel and context.
	 *
	 * @var Queue[]
	 */
	private array $queues = [];

	/**
	 * Constructor.
	 *
	 * @param Available_Channels $channels Available channels.
	 */
	public function __construct(
		private readonly Available_Channels $channels,
	) {}

	/**
	 * Takes the pinned ID of a block, such as the `ref` of a Single Post, or else the top of its queue. Then removes the
	 * ID from the queue.
	 *
	 * @param string  $name    Channel name that the block uses.
	 * @param int     $ref     Pinned ID, or 0.
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context Block context.
	 * @return int|null The ID, or null when none remains.
	 */
	public function take_one( string $name, int $ref, array $args, array $context ): ?int {
		$queue = $this->queue( $name, $args, $context );
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
	 * The ID that a block would take from the top of its queue. This does not remove the ID.
	 *
	 * @param string  $name    Channel name that the block uses.
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context Block context.
	 * @return int|null The ID, or null when none remains.
	 */
	public function top( string $name, array $args, array $context ): ?int {
		$queue = $this->queue( $name, $args, $context );
		$top   = null;

		if ( $queue instanceof Queue ) {
			$top = $queue->top();
		}

		return $top;
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
				 * A block's arguments can include keys that this channel does not accept, such as from
				 * handwritten markup or an argument that the channel no longer has. Leaving them out gives
				 * every block that uses the same arguments the same queue.
				 */
				$used_args = array_intersect_key( $args, $channel->args() );
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
