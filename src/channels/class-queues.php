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
 * A block that takes the remaining IDs, like Channel Template, takes every ID left in its queue, up to a limit, and
 * removes them. The blocks after it in the same queue get the IDs past the limit, if any. The block reads the IDs with
 * `taken_by()` when it renders.
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
	 * The IDs that blocks took with `take_remaining()` and did not read yet, keyed by the parsed block.
	 *
	 * @var array<string, int[]>
	 */
	private array $taken_by_blocks = [];

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
	 * Takes the IDs that remain in a block's queue, from the top, up to a limit. Then removes them from the queue, and
	 * keeps them for the block until it reads them with `taken_by()`.
	 *
	 * @param string  $name         Channel name that the block uses.
	 * @param mixed[] $args         The block's arguments for the channel.
	 * @param mixed[] $context      Block context.
	 * @param int     $limit        The most IDs to take.
	 * @param mixed[] $parsed_block The block that takes the IDs.
	 * @return int[] The IDs, in queue order.
	 */
	public function take_remaining( string $name, array $args, array $context, int $limit, array $parsed_block ): array {
		$queue = $this->queue( $name, $args, $context );
		$taken = [];
		$top   = null;

		if ( $queue instanceof Queue && $limit > 0 ) {
			$top = $queue->top();
		}

		while ( null !== $top && $queue instanceof Queue ) {
			$queue->remove( $top );
			$taken[] = $top;
			$top     = count( $taken ) < $limit ? $queue->top() : null;
		}

		$key = wp_json_encode( $parsed_block );

		if ( is_string( $key ) ) {
			$this->taken_by_blocks[ $key ] = $taken;
		}

		return $taken;
	}

	/**
	 * The IDs that a block took with `take_remaining()`. Then forgets them, so a later copy of the same block does
	 * not read them.
	 *
	 * `Channel_Block_Support` takes the IDs in a context filter just before the block renders. The block gets only the
	 * first ID as `postId`, so it reads the rest here.
	 *
	 * @param mixed[] $parsed_block The block, as `take_remaining()` got it.
	 * @return int[] The IDs, or an empty array if the block took none.
	 */
	public function taken_by( array $parsed_block ): array {
		$key   = wp_json_encode( $parsed_block );
		$taken = [];

		if ( is_string( $key ) && isset( $this->taken_by_blocks[ $key ] ) ) {
			$taken = $this->taken_by_blocks[ $key ];
			unset( $this->taken_by_blocks[ $key ] );
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
