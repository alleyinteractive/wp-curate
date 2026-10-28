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
	 * The arguments that the channel reads, as fields for the editor: the term. The editor script
	 * `entries/block-editor/latestPostsInTermArgs` adds a term picker for the `term` field of a
	 * channel whose name ends with the field's `taxonomy` and `_latest`.
	 *
	 * @phpstan-return list<array{id: string, label: string, ...<string, mixed>}>
	 *
	 * @return array[]
	 */
	public function arg_fields(): array {
		return [
			[
				'id'       => 'term',
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
	 * @return iterable Integer IDs. Empty without a term.
	 */
	public function ids( array $args, array $context ): iterable {
		$posts = $this->posts( [], $args );
		$ids   = [];

		if ( $posts instanceof Queried_Post_Ids ) {
			$ids = $posts->post_ids();
		}

		return $ids;
	}

	/**
	 * IDs in the channel that match a search, in channel order.
	 *
	 * @phpstan-return iterable<int>
	 *
	 * @param string  $search  Search terms.
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return iterable Integer IDs. Empty without a term.
	 */
	public function ids_matching( string $search, array $args, array $context ): iterable {
		$posts = $this->posts( [ 's' => $search ], $args );
		$ids   = [];

		if ( $posts instanceof Queried_Post_Ids ) {
			$ids = $posts->post_ids();
		}

		return $ids;
	}

	/**
	 * Number of IDs in the channel.
	 *
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return int Number of IDs. 0 without a term.
	 */
	public function total( array $args, array $context ): int {
		$posts = $this->posts( [], $args );
		$total = 0;

		if ( $posts instanceof Queried_Post_Ids ) {
			$total = $posts->total();
		}

		return $total;
	}

	/**
	 * Number of IDs in the channel that match a search.
	 *
	 * @param string  $search  Search terms.
	 * @param mixed[] $args    The block's arguments for the channel.
	 * @param mixed[] $context The block context values in `uses_context()`.
	 * @return int Number of IDs. 0 without a term.
	 */
	public function total_matching( string $search, array $args, array $context ): int {
		$posts = $this->posts( [ 's' => $search ], $args );
		$total = 0;

		if ( $posts instanceof Queried_Post_Ids ) {
			$total = $posts->total();
		}

		return $total;
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
	 * @param array<string, mixed> $query_args Query arguments to add to the channel's own.
	 * @param mixed[]              $args       The block's arguments for the channel.
	 * @return Queried_Post_Ids|null The posts, or null without a term in the taxonomy.
	 */
	private function posts( array $query_args, array $args ): ?Queried_Post_Ids {
		$term_id = 0;
		$term    = null;
		$posts   = null;

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
			$posts = new Queried_Post_Ids(
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
