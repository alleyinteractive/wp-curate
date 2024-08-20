<?php
/**
 * History class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Post_IDs;

use Alley\WP\Types\Post_IDs;

/**
 * Track post IDs that have been used, e.g. while rendering a page.
 */
final class History implements Post_IDs {
	/**
	 * Used post IDs.
	 *
	 * @var array<int, true>
	 */
	private array $ids = [];

	/**
	 * Set up.
	 *
	 * @param Post_IDs $seed Initial post IDs.
	 */
	public function __construct(
		private readonly Post_IDs $seed,
	) {
		add_action( 'wp_curate_clear_history_post_ids', [ $this, 'clear' ] );
	}

	/**
	 * Post IDs.
	 *
	 * @return int[]
	 */
	public function post_ids(): array {
		return array_merge( array_keys( $this->ids ), $this->seed->post_ids() );
	}

	/**
	 * Record used post IDs.
	 *
	 * @param int|int[] $post_ids Post ID or IDs.
	 */
	public function record( int|array $post_ids ): void {
		if ( \is_int( $post_ids ) ) {
			$post_ids = [ $post_ids ];
		}

		foreach ( $post_ids as $post_id ) {
			if ( \is_int( $post_id ) ) {
				$this->ids[ $post_id ] = true;
			}
		}
	}

	/**
	 * Clear the history.
	 */
	public function clear(): void {
		$this->ids = [];
	}
}
