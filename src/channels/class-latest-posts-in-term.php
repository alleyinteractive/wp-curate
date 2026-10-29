<?php
/**
 * Latest_Posts_In_Term class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

use WP_Post_Type;
use WP_Taxonomy;
use WP_Term;

/**
 * The latest published posts of one post type in a term, most recent first.
 *
 * The block gives the term ID as the `term` argument. The term's children count as in it, like on a
 * category archive.
 */
final readonly class Latest_Posts_In_Term implements Channel {
	/**
	 * Constructor.
	 *
	 * @param string $post_type Post type slug.
	 * @param string $taxonomy  Taxonomy slug.
	 */
	public function __construct(
		private string $post_type,
		private string $taxonomy,
	) {}

	/**
	 * Machine name that blocks use to name the channel, such as `post_category_latest`.
	 *
	 * @return string
	 */
	public function name(): string {
		return $this->post_type . '_' . $this->taxonomy . '_latest';
	}

	/**
	 * Human-readable name of the channel, such as "Latest Posts in Category".
	 *
	 * @return string
	 */
	public function label(): string {
		/* translators: 1: Plural post type name, 2: Singular taxonomy name. */
		return sprintf( __( 'Latest %1$s in %2$s', 'wp-curate' ), $this->post_type_name(), $this->taxonomy_name() );
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
	 * The arguments that the channel reads: the term. The editor script
	 * `entries/block-editor/latestPostsInTermArgs` adds a term picker for the `term` argument of a
	 * channel whose name ends with the argument's `taxonomy` and `_latest`.
	 *
	 * @phpstan-return array<string, array{label: string, ...<string, mixed>}>
	 *
	 * @return array[]
	 */
	public function args(): array {
		return [
			'term' => [
				'label'    => $this->taxonomy_name(),
				'required' => true,
				'taxonomy' => $this->taxonomy,
			],
		];
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
	public function eligible( array $context ): bool {
		return true;
	}

	/**
	 * Whether a user can read the channel.
	 *
	 * @param int $user_id User ID, or 0 for a visitor who is not logged in.
	 * @return bool
	 */
	public function can_read( int $user_id ): bool {
		return user_can( $user_id, 'edit_posts' );
	}

	/**
	 * IDs in the channel, in channel order, and the number of them.
	 *
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @param string  $search  Search terms, or an empty string for every ID.
	 * @return Results No IDs without a term.
	 */
	public function results( array $args, array $context, string $search ): Results {
		return $this->posts( $args, $search );
	}

	/**
	 * Plural name of the post type, such as "Posts".
	 *
	 * @return string
	 */
	private function post_type_name(): string {
		$name   = $this->post_type;
		$object = get_post_type_object( $this->post_type );

		if ( $object instanceof WP_Post_Type && is_string( $object->labels->name ) ) {
			$name = $object->labels->name;
		}

		return $name;
	}

	/**
	 * Singular name of the taxonomy, such as "Category".
	 *
	 * @return string
	 */
	private function taxonomy_name(): string {
		$name   = $this->taxonomy;
		$object = get_taxonomy( $this->taxonomy );

		if ( $object instanceof WP_Taxonomy && is_string( $object->labels->singular_name ) ) {
			$name = $object->labels->singular_name;
		}

		return $name;
	}

	/**
	 * The channel's posts in the term, in channel order.
	 *
	 * The query keeps its own `orderby`, so a search returns matches in channel order, not by relevance.
	 *
	 * @param mixed[] $args   The block's arguments for the channel.
	 * @param string  $search Search terms, or an empty string for every post.
	 * @return Results The posts, or none without a term in the taxonomy.
	 */
	private function posts( array $args, string $search ): Results {
		$term_id    = 0;
		$term       = null;
		$posts      = new Empty_Results();
		$query_args = [];

		if ( '' !== $search ) {
			$query_args['s'] = $search;
		}

		if ( isset( $args['term'] ) ) {
			$term_id = $args['term'];
		}

		// The REST API gives the arguments as strings, and blocks give them as integers.
		if ( is_string( $term_id ) && ctype_digit( $term_id ) ) {
			$term_id = (int) $term_id;
		}

		if ( is_int( $term_id ) && $term_id > 0 ) {
			$term = get_term( $term_id, $this->taxonomy );
		}

		if ( $term instanceof WP_Term ) {
			$posts = new Queried_Post_IDs(
				array_merge(
					$query_args,
					[
						'ignore_sticky_posts' => true,
						'order'               => 'DESC',
						'orderby'             => 'date',
						'post_status'         => 'publish',
						'post_type'           => $this->post_type,
						// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
						'tax_query'           => [
							[
								'field'    => 'term_id',
								'taxonomy' => $this->taxonomy,
								'terms'    => $term->term_id,
							],
						],
					],
				),
			);
		}

		return $posts;
	}
}
