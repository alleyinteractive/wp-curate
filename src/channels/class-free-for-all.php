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
	 * The arguments that the channel reads. The editor script `entries/block-editor/freeForAllArgs`
	 * adds the controls of this channel by argument name, and reads the `options`, `taxonomy`, and
	 * `help` keys.
	 *
	 * @phpstan-return array<string, array{label: string, ...<string, mixed>}>
	 *
	 * @return array[]
	 */
	public function args(): array {
		return [
			'post_types'   => [
				'label'    => __( 'Post Types', 'wp-curate' ),
				'options'  => $this->post_type_options(),
				'required' => true,
			],
			'categories'   => [
				'label'    => $this->taxonomy_name( 'category', __( 'Categories', 'wp-curate' ) ),
				'taxonomy' => 'category',
			],
			'tags'         => [
				'label'    => $this->taxonomy_name( 'post_tag', __( 'Tags', 'wp-curate' ) ),
				'taxonomy' => 'post_tag',
			],
			'tax_relation' => [
				'help'    => __( 'AND: Posts must meet all selected taxonomy requirements. OR: Posts may meet one or more selected taxonomy requirements.', 'wp-curate' ),
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
			'search'       => [
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
	public function available( array $context ): bool {
		return true;
	}

	/**
	 * Whether a user can read the channel. A block can select any of the post types, so the user
	 * must be able to read each one: anyone, if it is viewable on the site, or else a user who can
	 * edit posts of the type.
	 *
	 * @param int $user_id User ID, or 0 for a visitor who is not logged in.
	 * @return bool
	 */
	public function can_read( int $user_id ): bool {
		$can_read = true;

		foreach ( $this->post_types as $post_type ) {
			$type_can_read = false;
			$object        = get_post_type_object( $post_type );

			if ( $object instanceof WP_Post_Type ) {
				$type_can_read = is_post_type_viewable( $object );
			}

			if (
				! $type_can_read
				&& $object instanceof WP_Post_Type
				&& isset( $object->cap->edit_posts )
				&& is_string( $object->cap->edit_posts )
			) {
				$type_can_read = user_can( $user_id, $object->cap->edit_posts );
			}

			if ( ! $type_can_read ) {
				$can_read = false;
			}
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
	 * @return Channel_IDs No IDs without a post type.
	 */
	public function ids( array $args, array $context, string $search ): Channel_IDs {
		return $this->posts( $args, $search );
	}

	/**
	 * The posts that match the block's query and a search, in channel order.
	 *
	 * The query keeps its own `orderby`, so a search returns matches in channel order, not by
	 * relevance. A search of the picker adds to the block's own search term.
	 *
	 * @param mixed[] $args   The block's arguments for the channel.
	 * @param string  $search Search terms, or an empty string.
	 * @return Channel_IDs The posts, or none without a post type.
	 */
	private function posts( array $args, string $search ): Channel_IDs {
		$post_types = [];
		$relation   = 'AND';
		$own_search = '';
		$posts      = new Empty_Channel_IDs();
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
