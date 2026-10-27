<?php
/**
 * Deduplication class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

use Alley\WP\Types\Post_IDs;

/**
 * The IDs that a channel block in one post skips at the top of its channel's queue, by the post's
 * deduplication rule.
 *
 * With deduplication on, a block skips the IDs that the blocks before it took from any channel.
 * With unique pinned posts also on, it skips the IDs that any channel block in the post pins. A
 * block always shows its own pinned post. Keep the rules matched with `useChannelQueue()`.
 */
final readonly class Deduplication implements Post_IDs {
	/**
	 * Constructor.
	 *
	 * @param bool     $enabled Whether deduplication is on.
	 * @param Post_IDs $taken   The IDs that blocks took from any channel so far.
	 * @param Post_IDs $pinned  The IDs that channel blocks in the post pin, if unique pinned posts is on.
	 */
	public function __construct(
		private bool $enabled,
		private Post_IDs $taken,
		private Post_IDs $pinned,
	) {}

	/**
	 * Post IDs.
	 *
	 * @return int[]
	 */
	public function post_ids(): array {
		$skipped = [];

		if ( $this->enabled ) {
			$skipped = array_merge( $this->taken->post_ids(), $this->pinned->post_ids() );
		}

		return $skipped;
	}
}
