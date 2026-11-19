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
 * A block takes an ID for each of its slots, in order, with `take()`, when it renders. The Single Post block has one
 * slot. A block of another plugin takes its own slots in the same way. Keep its slots matched with the
 * `channelSlots` callback that its block type gives in the editor.
 *
 * A block that shows the remaining IDs, like Channel Loop, renders one Single Post block at a time while its queue
 * has a `top()`, up to `MAX_SLOTS`. Each Single Post takes the top of the queue. The blocks after it in the same queue
 * get the IDs past the limit, if any.
 *
 * Keep these rules matched with `useChannelQueue()`.
 */
final class Queues {
	/**
	 * The most slots that one block can have.
	 *
	 * Keep the value matched with `MAX_CHANNEL_SLOTS` in the `useBlockChannel` hook.
	 *
	 * @var int
	 */
	public const MAX_SLOTS = 100;

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
	 * Takes an ID for each slot of a block, in order, and removes each ID from the queue.
	 *
	 * A slot with a pin takes the pin. A pin that is not published, such as a scheduled post, gives its place to the top
	 * of the queue. Other slots take the top of the queue. Each ID is removed before the next slot takes, so a block does
	 * not show the same post twice, except a pin that an earlier slot took as the top of the queue.
	 *
	 * The caller must still check that visitors can see each post, such as with `is_post_publicly_viewable()`.
	 *
	 * @param string  $name    Channel name that the block uses.
	 * @param mixed[] $refs    The pinned ID of each slot, or 0 for the top of the queue. Only the first `MAX_SLOTS` count.
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context Block context.
	 * @return array<int|null> The ID that each slot took, in the order of the slots, or null for a slot when no ID remains.
	 */
	public function take( string $name, array $refs, array $args, array $context ): array {
		$taken = [];

		foreach ( array_slice( $refs, 0, self::MAX_SLOTS ) as $ref ) {
			if ( ! is_int( $ref ) || $ref < 1 || 'publish' !== get_post_status( $ref ) ) {
				$ref = 0;
			}

			$taken[] = $this->take_one( $name, $ref, $args, $context );
		}

		return $taken;
	}

	/**
	 * Takes the pinned ID of a block, such as the `ref` of a Single Post, or else the top of its queue. Then removes the
	 * ID from the queue.
	 *
	 * This takes any pin, such as a scheduled post. To apply the rules for pins, use `take()`.
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
