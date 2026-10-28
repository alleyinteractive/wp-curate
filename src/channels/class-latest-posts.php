<?php
/**
 * Latest_Posts class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

use WP_Post_Type;

/**
 * The latest published posts of one post type, most recent first.
 */
final readonly class Latest_Posts implements Channel {
	/**
	 * Constructor.
	 *
	 * @param string $post_type Post type slug.
	 */
	public function __construct(
		private string $post_type,
	) {}

	/**
	 * Machine name that blocks use to name the channel, such as `post_latest` for posts.
	 *
	 * @return string
	 */
	public function name(): string {
		return $this->post_type . '_latest';
	}

	/**
	 * Human-readable name of the channel, such as "Latest Posts".
	 *
	 * @return string
	 */
	public function label(): string {
		$plural = $this->post_type;
		$object = get_post_type_object( $this->post_type );

		if ( $object instanceof WP_Post_Type && is_string( $object->labels->name ) ) {
			$plural = $object->labels->name;
		}

		/* translators: %s: Plural post type name. */
		return sprintf( __( 'Latest %s', 'wp-curate' ), $plural );
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
	 * The arguments that the channel reads: none.
	 *
	 * @phpstan-return array<string, array{label: string, ...<string, mixed>}>
	 *
	 * @return array[]
	 */
	public function args(): array {
		return [];
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
	 * Whether a block with the context can select the channel.
	 *
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return bool
	 */
	public function is_available( array $context ): bool {
		return true;
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
	 * @phpstan-return iterable<int>
	 *
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return iterable Integer IDs.
	 */
	public function ids( array $args, array $context ): iterable {
		return $this->posts( [] )->post_ids();
	}

	/**
	 * IDs in the channel that match a search, in channel order.
	 *
	 * @phpstan-return iterable<int>
	 *
	 * @param string  $search  Search terms.
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return iterable Integer IDs.
	 */
	public function ids_matching( string $search, array $args, array $context ): iterable {
		return $this->posts( [ 's' => $search ] )->post_ids();
	}

	/**
	 * Number of IDs in the channel.
	 *
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return int Number of IDs.
	 */
	public function total( array $args, array $context ): int {
		return $this->posts( [] )->total();
	}

	/**
	 * Number of IDs in the channel that match a search.
	 *
	 * @param string  $search  Search terms.
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return int Number of IDs.
	 */
	public function total_matching( string $search, array $args, array $context ): int {
		return $this->posts( [ 's' => $search ] )->total();
	}

	/**
	 * The channel's posts, in channel order.
	 *
	 * The query keeps its own `orderby`, so a search returns matches in channel order, not by relevance.
	 *
	 * @param array<string, mixed> $query_args Query arguments to add to the channel's own.
	 * @return Queried_Post_Ids
	 */
	private function posts( array $query_args ): Queried_Post_Ids {
		return new Queried_Post_Ids(
			array_merge(
				$query_args,
				[
					'ignore_sticky_posts' => true,
					'order'               => 'DESC',
					'orderby'             => 'date',
					'post_status'         => 'publish',
					'post_type'           => $this->post_type,
				],
			),
		);
	}
}
