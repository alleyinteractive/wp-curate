<?php
/**
 * Latest_Posts class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

use WP_Query;

/**
 * The latest published posts of the `post` post type, most recent first.
 */
final readonly class Latest_Posts implements Channel {
	/**
	 * Number of posts to query at a time.
	 *
	 * @var int
	 */
	private const BATCH_SIZE = 20;

	/**
	 * Machine name that blocks use to name the channel.
	 *
	 * @return string
	 */
	public function name(): string {
		return 'latest_posts';
	}

	/**
	 * Human-readable name of the channel.
	 *
	 * @return string
	 */
	public function label(): string {
		return __( 'Latest Posts', 'wp-curate' );
	}

	/**
	 * The core-data entity kind of the channel's IDs.
	 *
	 * @return string
	 */
	public function entity_kind(): string {
		return 'postType';
	}

	/**
	 * Names of the block context values that the channel reads.
	 *
	 * @return string[]
	 */
	public function uses_context(): array {
		return [];
	}

	/**
	 * Human-readable name of the channel order.
	 *
	 * @return string
	 */
	public function order_label(): string {
		return __( 'Most recent', 'wp-curate' );
	}

	/**
	 * Direction of the channel order.
	 *
	 * @return string
	 */
	public function order_direction(): string {
		return 'desc';
	}

	/**
	 * IDs in the channel, in channel order.
	 *
	 * Posts are queried in batches, so a caller that stops early does not query every post.
	 *
	 * @phpstan-return iterable<int>
	 *
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return iterable Integer IDs.
	 */
	public function ids( array $context ): iterable {
		$page       = 1;
		$batch_size = self::BATCH_SIZE;

		// A batch that is smaller than the batch size is the last one.
		while ( self::BATCH_SIZE === $batch_size ) {
			$query = new WP_Query(
				[
					'fields'              => 'ids',
					'ignore_sticky_posts' => true,
					'no_found_rows'       => true,
					'order'               => 'DESC',
					'orderby'             => 'date',
					'paged'               => $page,
					'post_status'         => 'publish',
					'post_type'           => 'post',
					'posts_per_page'      => self::BATCH_SIZE,
				],
			);

			$batch_size = count( $query->posts );

			foreach ( $query->posts as $post_id ) {
				if ( is_int( $post_id ) ) {
					yield $post_id;
				}
			}

			++$page;
		}
	}
}
