<?php
/**
 * Post_IDs_Taken_From_Channels class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Post_IDs;

use Alley\WP\Types\Post_IDs;

/**
 * Post IDs that blocks took from any channel queue during a request.
 *
 * It is apart from `History`, which tracks the posts that Query blocks use, because channel blocks
 * deduplicate only among themselves.
 */
final class Post_IDs_Taken_From_Channels implements Post_IDs {
	/**
	 * Taken post IDs, as keys.
	 *
	 * @var array<int, true>
	 */
	private array $ids = [];

	/**
	 * Post IDs.
	 *
	 * @return int[]
	 */
	public function post_ids(): array {
		return array_keys( $this->ids );
	}

	/**
	 * Record a taken post ID.
	 *
	 * @param int $post_id Post ID.
	 */
	public function record( int $post_id ): void {
		$this->ids[ $post_id ] = true;
	}
}
