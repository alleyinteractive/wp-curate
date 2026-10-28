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
	public function available( array $context ): bool {
		return true;
	}

	/**
	 * Whether a user can read the channel: anyone, if the post type is viewable on the site, or else
	 * a user who can edit posts of the type.
	 *
	 * @param int $user_id User ID, or 0 for a visitor who is not logged in.
	 * @return bool
	 */
	public function can_read( int $user_id ): bool {
		$can_read = false;
		$object   = get_post_type_object( $this->post_type );

		if ( $object instanceof WP_Post_Type ) {
			$can_read = is_post_type_viewable( $object );
		}

		if (
			! $can_read
			&& $object instanceof WP_Post_Type
			&& isset( $object->cap->edit_posts )
			&& is_string( $object->cap->edit_posts )
		) {
			$can_read = user_can( $user_id, $object->cap->edit_posts );
		}

		return $can_read;
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
	 * IDs in the channel, in channel order, and the number of them.
	 *
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @param string  $search  Search terms, or an empty string for every ID.
	 * @return Channel_IDs
	 */
	public function ids( array $args, array $context, string $search ): Channel_IDs {
		return $this->posts( $search );
	}

	/**
	 * The channel's posts, in channel order.
	 *
	 * The query keeps its own `orderby`, so a search returns matches in channel order, not by relevance.
	 *
	 * @param string $search Search terms, or an empty string for every post.
	 * @return Queried_Post_Ids
	 */
	private function posts( string $search ): Queried_Post_Ids {
		$query_args = [];

		if ( '' !== $search ) {
			$query_args['s'] = $search;
		}

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
