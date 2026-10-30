<?php
/**
 * Parsely_Trending_Posts class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

use Alley\WP\WP_Curate\Features\Parsely_Support;

/**
 * The published posts that are most viewed in Parse.ly now, most viewed first.
 *
 * A channel that queries posts, like `Latest_Posts`, gets more posts in batches for as long as
 * blocks take them. This channel gets all of its posts from Parse.ly in one request, so the number
 * of posts in that request is the most posts that the channel can give.
 */
final readonly class Parsely_Trending_Posts implements Channel {
	/**
	 * Constructor.
	 *
	 * @param Parsely_Support $parsely    Parse.ly support, which requests and caches the trending posts.
	 * @param int             $limit      Number of posts to request from Parse.ly. This is the most
	 *                                    posts that the channel can give to all of the blocks on a
	 *                                    page and to the picker. Posts that are not published or not
	 *                                    of a supported post type are removed after the request, so
	 *                                    the channel can give fewer.
	 * @param string[]        $post_types Post type slugs that the channel can give.
	 */
	public function __construct(
		private Parsely_Support $parsely,
		private int $limit,
		private array $post_types,
	) {}

	/**
	 * Machine name that blocks use to name the channel, such as `post_latest` for posts.
	 *
	 * @return string
	 */
	public function name(): string {
		return 'parsely_trending';
	}

	/**
	 * Human-readable name of the channel, such as "All Topics".
	 *
	 * @return string
	 */
	public function label(): string {
		return __( 'Trending Posts', 'wp-curate' );
	}

	/**
	 * The core-data entity kind of the channel's IDs, e.g. `postType` for posts or `taxonomy` for terms.
	 *
	 * @return string
	 */
	public function entity_kind(): string {
		return 'postType';
	}

	/**
	 * The arguments that the channel accepts, keyed by argument name, like the `args` of a REST API route.
	 *
	 * @phpstan-return array<string, array{label: string, ...<string, mixed>}>
	 *
	 * @return array[]
	 */
	public function args(): array {
		return [];
	}

	/**
	 * Names of the block context values that the channel reads in order to supply posts.
	 *
	 * @return string[]
	 */
	public function uses_context(): array {
		return [];
	}

	/**
	 * Whether a block with the given context can use the channel.
	 *
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return bool
	 */
	public function eligible( array $context ): bool {
		return true;
	}

	/**
	 * Whether a user can read the channel.
	 *
	 * @param int $user_id User ID.
	 * @return bool
	 */
	public function can_read( int $user_id ): bool {
		return user_can( $user_id, 'edit_posts' );
	}

	/**
	 * IDs in the channel, in channel order, and the number of them.
	 *
	 * Only the trending posts that are published and of a supported post type are in the channel.
	 *
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @param string  $search  Search terms, or an empty string for every ID.
	 * @return Results No IDs if the arguments and context do not make a channel.
	 */
	public function results( array $args, array $context, string $search ): Results {
		$post_ids = $this->trending_post_ids();
		$results  = new Empty_Results();

		// An empty `post__in` does not limit a query, so the channel has no posts without IDs.
		if ( [] !== $post_ids && [] !== $this->post_types ) {
			$results = $this->posts( $post_ids, $search );
		}

		return $results;
	}

	/**
	 * The IDs of the most viewed posts in Parse.ly, most viewed first, without duplicates.
	 *
	 * @return int[]
	 */
	private function trending_post_ids(): array {
		$out      = [];
		$trending = $this->parsely->get_trending_posts(
			[
				'posts_per_page' => $this->limit,
			],
		);

		foreach ( $trending as $post_id ) {
			// A URL that is not a post on this site gives 0.
			if ( $post_id > 0 && ! in_array( $post_id, $out, true ) ) {
				$out[] = $post_id;
			}
		}

		return $out;
	}

	/**
	 * The given posts, in the given order.
	 *
	 * @param int[]  $post_ids Post IDs, in order.
	 * @param string $search   Search terms, or an empty string for every post.
	 * @return Queried_Post_IDs
	 */
	private function posts( array $post_ids, string $search ): Queried_Post_IDs {
		$query_args = [];

		if ( '' !== $search ) {
			$query_args['s'] = $search;
		}

		return new Queried_Post_IDs(
			array_merge(
				$query_args,
				[
					'ignore_sticky_posts' => true,
					'orderby'             => 'post__in',
					'post__in'            => $post_ids,
					'post_status'         => 'publish',
					'post_type'           => $this->post_types,
				],
			),
		);
	}
}
