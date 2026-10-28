<?php
/**
 * Free_For_All class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

use WP_Post_Type;
use WP_Taxonomy;

/**
 * The latest published posts that match the block's query, most recent first: the Free-For-All
 * channel.
 *
 * The block gives the query as arguments, like the query parameters of the Query block: the post
 * types, the categories and tags, the relation between the categories and the tags, and a search
 * term. The channel needs at least one post type. A post matches the categories if it is in any of
 * them, and likewise for the tags.
 */
final readonly class Free_For_All implements Channel {
	/**
	 * Constructor.
	 *
	 * @param string[] $post_types The post types that a block can select.
	 */
	public function __construct(
		private array $post_types,
	) {}

	/**
	 * Machine name that blocks use to name the channel.
	 *
	 * @return string
	 */
	public function name(): string {
		return 'free_for_all';
	}

	/**
	 * Human-readable name of the channel.
	 *
	 * @return string
	 */
	public function label(): string {
		return __( 'Free-For-All', 'wp-curate' );
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
	 * The arguments that the channel reads, as fields for the editor. The editor script
	 * `entries/block-editor/freeForAllArgs` adds the controls of this channel by field `id`, and
	 * reads the `options`, `taxonomy`, and `help` keys.
	 *
	 * @phpstan-return list<array{id: string, label: string, ...<string, mixed>}>
	 *
	 * @return array[]
	 */
	public function arg_fields(): array {
		return [
			[
				'id'       => 'post_types',
				'label'    => __( 'Post Types', 'wp-curate' ),
				'options'  => $this->post_type_options(),
				'required' => true,
			],
			[
				'id'       => 'categories',
				'label'    => $this->taxonomy_name( 'category', __( 'Categories', 'wp-curate' ) ),
				'taxonomy' => 'category',
			],
			[
				'id'       => 'tags',
				'label'    => $this->taxonomy_name( 'post_tag', __( 'Tags', 'wp-curate' ) ),
				'taxonomy' => 'post_tag',
			],
			[
				'help'    => __( 'AND: Posts must meet all selected taxonomy requirements. OR: Posts may meet one or more selected taxonomy requirements.', 'wp-curate' ),
				'id'      => 'tax_relation',
				'label'   => __( 'Taxonomy Relation', 'wp-curate' ),
				'options' => [
					[
						'label' => __( 'AND', 'wp-curate' ),
						'value' => 'AND',
					],
					[
						'label' => __( 'OR', 'wp-curate' ),
						'value' => 'OR',
					],
				],
			],
			[
				'id'    => 'search',
				'label' => __( 'Search Term', 'wp-curate' ),
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
	 * @return iterable Integer IDs.
	 */
	public function ids( array $args, array $context ): iterable {
		$posts = $this->posts( $args, '' );
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
	 * @return iterable Integer IDs.
	 */
	public function ids_matching( string $search, array $args, array $context ): iterable {
		$posts = $this->posts( $args, $search );
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
	 * @return int Number of IDs.
	 */
	public function total( array $args, array $context ): int {
		$posts = $this->posts( $args, '' );
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
	 * @return int Number of IDs.
	 */
	public function total_matching( string $search, array $args, array $context ): int {
		$posts = $this->posts( $args, $search );
		$total = 0;

		if ( $posts instanceof Queried_Post_Ids ) {
			$total = $posts->total();
		}

		return $total;
	}

	/**
	 * The posts that match the block's query and a search, in channel order.
	 *
	 * The query keeps its own `orderby`, so a search returns matches in channel order, not by
	 * relevance. A search of the picker adds to the block's own search term.
	 *
	 * @param mixed[] $args   The block's arguments for the channel.
	 * @param string  $search Search terms, or an empty string.
	 * @return Queried_Post_Ids|null The posts, or null without a post type.
	 */
	private function posts( array $args, string $search ): ?Queried_Post_Ids {
		$post_types = [];
		$relation   = 'AND';
		$own_search = '';
		$posts      = null;
		$tax_query  = [];

		if ( isset( $args['post_types'] ) && is_array( $args['post_types'] ) ) {
			$post_types = array_values( array_intersect( $this->post_types, array_filter( $args['post_types'], 'is_string' ) ) );
		}

		if ( isset( $args['tax_relation'] ) && 'OR' === $args['tax_relation'] ) {
			$relation = 'OR';
		}

		if ( isset( $args['search'] ) && is_string( $args['search'] ) ) {
			$own_search = $args['search'];
		}

		foreach ( [
			'categories' => 'category',
			'tags'       => 'post_tag',
		] as $key => $taxonomy ) {
			$term_ids = [];

			if ( isset( $args[ $key ] ) ) {
				$term_ids = $this->term_ids( $args[ $key ] );
			}

			if ( [] !== $term_ids ) {
				$tax_query[] = [
					'field'    => 'term_id',
					'operator' => 'IN',
					'taxonomy' => $taxonomy,
					'terms'    => $term_ids,
				];
			}
		}

		$query_args = [
			'ignore_sticky_posts' => true,
			'order'               => 'DESC',
			'orderby'             => 'date',
			'post_status'         => 'publish',
			'post_type'           => $post_types,
		];

		if ( [] !== $tax_query ) {
			// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
			$query_args['tax_query'] = array_merge( [ 'relation' => $relation ], $tax_query );
		}

		$all_search = trim( $own_search . ' ' . $search );

		if ( '' !== $all_search ) {
			$query_args['s'] = $all_search;
		}

		if ( [] !== $post_types ) {
			$posts = new Queried_Post_Ids( $query_args );
		}

		return $posts;
	}

	/**
	 * The term IDs in an argument. The REST API gives them as strings, and blocks give them as
	 * integers.
	 *
	 * @param mixed $value The argument.
	 * @return int[]
	 */
	private function term_ids( mixed $value ): array {
		$term_ids = [];

		if ( ! is_array( $value ) ) {
			$value = [];
		}

		foreach ( $value as $term_id ) {
			if ( is_string( $term_id ) && ctype_digit( $term_id ) ) {
				$term_id = (int) $term_id;
			}

			if ( is_int( $term_id ) && $term_id > 0 ) {
				$term_ids[] = $term_id;
			}
		}

		return array_values( array_unique( $term_ids ) );
	}

	/**
	 * The options of the post types field: each post type that a block can select, with its name.
	 *
	 * @phpstan-return list<array{label: string, value: string}>
	 *
	 * @return array[]
	 */
	private function post_type_options(): array {
		$options = [];

		foreach ( $this->post_types as $post_type ) {
			$label  = $post_type;
			$object = get_post_type_object( $post_type );

			if ( $object instanceof WP_Post_Type && is_string( $object->labels->name ) ) {
				$label = $object->labels->name;
			}

			$options[] = [
				'label' => $label,
				'value' => $post_type,
			];
		}

		return $options;
	}

	/**
	 * Plural name of a taxonomy.
	 *
	 * @param string $taxonomy Taxonomy slug.
	 * @param string $fallback Name if the taxonomy is not registered.
	 * @return string
	 */
	private function taxonomy_name( string $taxonomy, string $fallback ): string {
		$name   = $fallback;
		$object = get_taxonomy( $taxonomy );

		if ( $object instanceof WP_Taxonomy && is_string( $object->labels->name ) ) {
			$name = $object->labels->name;
		}

		return $name;
	}
}
