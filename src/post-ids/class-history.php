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
	 * The seed after the `wp_curate_history_seed` filter has run.
	 *
	 * Resolved on first use, so that callbacks added by themes are included, and
	 * kept so that the filter runs once per request.
	 *
	 * @var Post_IDs|null
	 */
	private ?Post_IDs $filtered_seed = null;

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
		return array_merge( array_keys( $this->ids ), $this->get_filtered_seed()->post_ids() );
	}

	/**
	 * Get the seed, after it has been filtered.
	 */
	private function get_filtered_seed(): Post_IDs {
		if ( null === $this->filtered_seed ) {
			/**
			 * Filter the seed for the history of post IDs.
			 *
			 * Posts in the seed count as already used, so query blocks with
			 * deduplication enabled exclude them.
			 *
			 * @param Post_IDs $seed The seed for the history of post IDs.
			 */
			$seed = apply_filters( 'wp_curate_history_seed', $this->seed );

			// Callbacks can return anything, which the filter's stub type does not allow for.
			if ( ! $seed instanceof Post_IDs ) { // @phpstan-ignore instanceof.alwaysTrue
				_doing_it_wrong(
					'wp_curate_history_seed',
					sprintf( 'The filter must return an object that implements %s. The default seed was used instead.', Post_IDs::class ),
					'3.5.0',
				);

				$seed = $this->seed;
			}

			$this->filtered_seed = $seed;
		}

		return $this->filtered_seed;
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
			if ( \is_int( $post_id ) ) { // @phpstan-ignore-line function.alreadyNarrowedType
				$this->ids[ $post_id ] = true;
			}
		}
	}

	/**
	 * Clear the history.
	 *
	 * The seed is filtered again the next time it is needed.
	 */
	public function clear(): void {
		$this->ids           = [];
		$this->filtered_seed = null;
	}
}
