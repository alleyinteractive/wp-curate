<?php
/**
 * Queried_Post_IDs class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

use WP_Query;

/**
 * The IDs and count from the given query arguments.
 */
final readonly class Queried_Post_IDs implements Results {
	/**
	 * Number of posts to query at a time.
	 *
	 * @var int
	 */
	private const BATCH_SIZE = 20;

	/**
	 * Constructor.
	 *
	 * @phpstan-param array<string, mixed> $query_args
	 *
	 * @param mixed[] $query_args Query arguments that select the posts, in order.
	 */
	public function __construct(
		private array $query_args,
	) {}

	/**
	 * IDs in channel order.
	 *
	 * Posts are queried in batches, so a caller that stops early does not query every post.
	 *
	 * @phpstan-return iterable<int>
	 *
	 * @return iterable Integer IDs.
	 */
	public function ids(): iterable {
		$page       = 1;
		$batch_size = self::BATCH_SIZE;

		// A batch that is smaller than the batch size is the last one.
		while ( self::BATCH_SIZE === $batch_size ) {
			$query = new WP_Query(
				array_merge(
					$this->query_args,
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

	/**
	 * Total number of IDs in the results.
	 *
	 * @return int
	 */
	public function total(): int {
		$query = new WP_Query(
			array_merge(
				$this->query_args,
				[
					'fields'         => 'ids',
					'no_found_rows'  => false,
					'posts_per_page' => 1,
				],
			),
		);

		return $query->found_posts;
	}
}
