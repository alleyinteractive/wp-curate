<?php
/**
 * Queues class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

use WP_Post;

/**
 * The queues that blocks share during a request.
 *
 * Blocks specify their own channel. Each channel gets a separate queue for each set of arguments and context values
 * that it uses. Blocks take IDs in render order. A block takes its published pin, or else the top of its queue. Then
 * the ID is removed from that queue, so the blocks that use the same queue never show the same post twice. The queues
 * do not share IDs, so blocks that use different queues can show the same post.
 *
 * A block takes its IDs in order with `take()` when it renders, and shows each ID that it gets. The Single Post block
 * takes one ID. A block of another plugin takes its IDs in the same way. Keep the IDs that it takes matched with the
 * `channelPostsToTake` callback that its block type gives in the editor.
 *
 * `given_count()` counts the IDs that `take()` gives. A block that renders other blocks, like Channel Content, compares
 * the count before and after they render to know whether any of them shows a post.
 *
 * A block takes all of its IDs before its inner blocks render. So a block inside it that uses the same queue gets the
 * IDs after them. A block that shows the remaining IDs, like Channel Loop, takes `MAX_POSTS` IDs of 0 with one call,
 * and then renders its template for each post. The blocks after it in the same queue get the IDs past the limit, if
 * any. To render inner blocks for a post, see `Post_Template`.
 *
 * Keep these rules matched with `useChannelQueue()`.
 */
final class Queues {
	/**
	 * The most IDs that one block can take.
	 *
	 * Keep the value matched with `MAX_CHANNEL_POSTS` in the `useBlockChannel` hook.
	 *
	 * @var int
	 */
	public const MAX_POSTS = 100;

	/**
	 * Queues that exist so far, keyed by channel and context.
	 *
	 * @var Queue[]
	 */
	private array $queues = [];

	/**
	 * The number of IDs that `take()` has given.
	 *
	 * @var int
	 */
	private int $given = 0;

	/**
	 * Constructor.
	 *
	 * @param Available_Channels $channels Available channels.
	 */
	public function __construct(
		private readonly Available_Channels $channels,
	) {}

	/**
	 * Takes the IDs of a block in order, and removes each ID from the queue.
	 *
	 * A pin takes the pinned ID. A pin that is not published, such as a scheduled post, takes the top of the queue in its
	 * place. A ref of 0 takes the top of the queue. Each ID is removed before the next one is taken, so a block does not
	 * show the same post twice, except a pin that the block already took as the top of the queue.
	 *
	 * An ID whose post visitors cannot see, such as a post of a type that is not public, is removed from the queue, but
	 * the block gets null for it. So the block shows each ID that it gets, and `given_count()` counts only those IDs.
	 *
	 * @param string  $name    Channel name that the block uses.
	 * @param mixed[] $refs    The pinned ID of each post, or 0 for the top of the queue. Only the first `MAX_POSTS` count.
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context Block context.
	 * @return array<int|null> The ID taken for each ref, in the same order, or null where no ID remains or visitors
	 *                         cannot see the post.
	 */
	public function take( string $name, array $refs, array $args, array $context ): array {
		$taken = [];

		foreach ( array_slice( $refs, 0, self::MAX_POSTS ) as $ref ) {
			if ( ! is_int( $ref ) || $ref < 1 || 'publish' !== get_post_status( $ref ) ) {
				$ref = 0;
			}

			$id   = $this->take_one( $name, $ref, $args, $context );
			$post = null;

			if ( null !== $id ) {
				$post = get_post( $id );
			}

			// A published post can still be one that visitors cannot see, such as of a post type that is not public.
			if ( ! $post instanceof WP_Post || ! is_post_publicly_viewable( $post ) ) {
				$id = null;
			}

			if ( null !== $id ) {
				++$this->given;
			}

			$taken[] = $id;
		}

		return $taken;
	}

	/**
	 * The number of IDs that `take()` has given during the request.
	 *
	 * @return int
	 */
	public function given_count(): int {
		return $this->given;
	}

	/**
	 * Takes the pinned ID of a block, such as the `ref` of a Single Post, or else the top of its queue. Then removes the
	 * ID from the queue.
	 *
	 * This takes any pin, such as a scheduled post. `take()` applies the rules for pins.
	 *
	 * @param string  $name    Channel name that the block uses.
	 * @param int     $ref     Pinned ID, or 0.
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context Block context.
	 * @return int|null The ID, or null when none remains.
	 */
	private function take_one( string $name, int $ref, array $args, array $context ): ?int {
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
