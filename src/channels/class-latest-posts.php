<?php
/**
 * Latest_Posts class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

use Generator;
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
		return $this->post_ids( [] );
	}

	/**
	 * IDs in the channel that match a search, in channel order.
	 *
	 * @phpstan-return iterable<int>
	 *
	 * @param string  $search  Search terms.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return iterable Integer IDs.
	 */
	public function ids_matching( string $search, array $context ): iterable {
		return $this->post_ids( [ 's' => $search ] );
	}

	/**
	 * Number of IDs in the channel.
	 *
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return int Number of IDs.
	 */
	public function total( array $context ): int {
		return $this->post_total( [] );
	}

	/**
	 * Number of IDs in the channel that match a search.
	 *
	 * @param string  $search  Search terms.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return int Number of IDs.
	 */
	public function total_matching( string $search, array $context ): int {
		return $this->post_total( [ 's' => $search ] );
	}

	/**
	 * Query arguments that select the channel's posts, in channel order.
	 *
	 * `post_ids()` and `post_total()` both use them, so that the total counts the same posts.
	 *
	 * @return array<string, mixed>
	 */
	private function channel_query_args(): array {
		return [
			'ignore_sticky_posts' => true,
			'order'               => 'DESC',
			'orderby'             => 'date',
			'post_status'         => 'publish',
			'post_type'           => 'post',
		];
	}

	/**
	 * Number of the channel's posts.
	 *
	 * @param mixed[] $query_args Query arguments to add to the channel's own.
	 * @return int
	 */
	private function post_total( array $query_args ): int {
		$query = new WP_Query(
			array_merge(
				$query_args,
				$this->channel_query_args(),
				[
					'fields'         => 'ids',
					'no_found_rows'  => false,
					'posts_per_page' => 1,
				],
			),
		);

		return $query->found_posts;
	}

	/**
	 * IDs of the channel's posts, in channel order, queried in batches.
	 *
	 * The query keeps its own `orderby`, so a search returns matches in channel order, not by relevance.
	 *
	 * @phpstan-return Generator<int, int>
	 *
	 * @param mixed[] $query_args Query arguments to add to the channel's own.
	 * @return Generator
	 */
	private function post_ids( array $query_args ): Generator {
		$page       = 1;
		$batch_size = self::BATCH_SIZE;

		// A batch that is smaller than the batch size is the last one.
		while ( self::BATCH_SIZE === $batch_size ) {
			$query = new WP_Query(
				array_merge(
					$query_args,
					$this->channel_query_args(),
					[
						'fields'         => 'ids',
						'no_found_rows'  => true,
						'paged'          => $page,
						'posts_per_page' => self::BATCH_SIZE,
					],
				),
			);

			$post_ids = [];

			if ( is_array( $query->posts ) ) {
				$post_ids = $query->posts;
			}

			$batch_size = count( $post_ids );

			foreach ( $post_ids as $post_id ) {
				if ( is_int( $post_id ) ) {
					yield $post_id;
				}
			}

			++$page;
		}
	}
}
