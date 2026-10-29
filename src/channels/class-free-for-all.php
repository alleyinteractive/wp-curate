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
 * The published posts that match the block's query: the Free-For-All channel.
 *
 * The block gives the query as arguments, like the query parameters of the Query block: the post
 * types, the terms of each taxonomy, the relation between the taxonomies, a search term, and the
 * order. The post types, taxonomies, and order options are the ones that the Query block allows.
 * The channel needs at least one post type. A post matches the terms of a taxonomy if it has any of
 * them. Without an order, the most recent posts come first.
 */
final readonly class Free_For_All implements Channel {
	/**
	 * The arguments that the channel always has, which a taxonomy cannot use as its argument name.
	 *
	 * @var string[]
	 */
	private const FIXED_ARGS = [ 'meta_key', 'order', 'orderby', 'post_types', 'search', 'tax_relation' ];

	/**
	 * Constructor.
	 *
	 * @phpstan-param array<string, string> $orderby_options
	 *
	 * @param string[] $post_types      The post types that a block can select.
	 * @param string[] $taxonomies      The taxonomies whose terms a block can select.
	 * @param string[] $orderby_options Names of the ways to order the posts, keyed by `orderby` value.
	 * @param string[] $meta_keys       The meta keys whose values a block can order the posts by.
	 */
	public function __construct(
		private array $post_types,
		private array $taxonomies,
		private array $orderby_options,
		private array $meta_keys,
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
		$args = [
			'post_types' => [
				'label'    => __( 'Post Types', 'wp-curate' ),
				'options'  => $this->post_type_options(),
				'required' => true,
			],
		];

		foreach ( $this->taxonomies() as $taxonomy ) {
			$args[ $taxonomy ] = [
				'label'    => $this->taxonomy_name( $taxonomy ),
				'taxonomy' => $taxonomy,
			];
		}

		if ( count( $this->taxonomies() ) > 1 ) {
			$args['tax_relation'] = [
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
			];
		}

		$args['search'] = [
			'label' => __( 'Search Term', 'wp-curate' ),
		];

		$orderby_options = [];

		foreach ( $this->orderby_options() as $value => $label ) {
			$orderby_options[] = [
				'label' => $label,
				'value' => $value,
			];
		}

		$args['orderby'] = [
			'label'   => __( 'Order By', 'wp-curate' ),
			'options' => $orderby_options,
		];

		if ( [] !== $this->meta_keys ) {
			$args['meta_key'] = [
				'label'   => __( 'Meta Key', 'wp-curate' ),
				'options' => $this->meta_key_options(),
			];
		}

		$args['order'] = [
			'help'    => __( 'Ascending means A-Z or 0-9 or oldest to newest. Descending means Z-A or 9-0 or newest to oldest.', 'wp-curate' ),
			'label'   => __( 'Order Direction', 'wp-curate' ),
			'options' => [
				[
					'label' => __( 'Descending', 'wp-curate' ),
					'value' => 'desc',
				],
				[
					'label' => __( 'Ascending', 'wp-curate' ),
					'value' => 'asc',
				],
			],
		];

		return $args;
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
	 * @return Results No IDs without a post type.
	 */
	public function results( array $args, array $context, string $search ): Results {
		return $this->posts( $args, $search );
	}

	/**
	 * The posts that match the block's query and a search, in channel order.
	 *
	 * The query keeps its own `orderby`, so a search returns matches in channel order, not by
	 * relevance. A search of the picker adds to the block's own search term. Like the Query block,
	 * ordering by a meta value leaves out the posts without that meta.
	 *
	 * @param mixed[] $args   The block's arguments for the channel.
	 * @param string  $search Search terms, or an empty string.
	 * @return Results The posts, or none without a post type.
	 */
	private function posts( array $args, string $search ): Results {
		$post_types = [];
		$relation   = 'AND';
		$own_search = '';
		$posts      = new Empty_Results();
		$tax_query  = [];
		$orderby    = 'date';
		$order      = 'DESC';
		$meta_key   = '';

		if ( isset( $args['post_types'] ) && is_array( $args['post_types'] ) ) {
			$requested  = array_filter( $args['post_types'], 'is_string' );
			$allowed    = array_intersect( $this->post_types, $requested );
			$post_types = array_values( $allowed );
		}

		if ( isset( $args['tax_relation'] ) && 'OR' === $args['tax_relation'] ) {
			$relation = 'OR';
		}

		if ( isset( $args['search'] ) && is_string( $args['search'] ) ) {
			$own_search = $args['search'];
		}

		// Ordering by a meta value needs one of the allowed meta keys.
		if ( isset( $args['meta_key'] ) && in_array( $args['meta_key'], $this->meta_keys, true ) ) {
			$meta_key = $args['meta_key'];
		}

		if ( isset( $args['orderby'] ) && is_string( $args['orderby'] ) && isset( $this->orderby_options()[ $args['orderby'] ] ) ) {
			$orderby = $args['orderby'];
		}

		if ( 'meta_value' === $orderby && '' === $meta_key ) {
			$orderby = 'date';
		}

		if ( isset( $args['order'] ) && 'asc' === $args['order'] ) {
			$order = 'ASC';
		}

		foreach ( $this->taxonomies() as $taxonomy ) {
			$term_ids = [];

			if ( isset( $args[ $taxonomy ] ) ) {
				$term_ids = $this->term_ids( $args[ $taxonomy ] );
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

		/*
		 * Order ties by ID, so that the order is the same in every batch that `Queried_Post_Ids`
		 * reads. Without it, posts with the same value can repeat or go missing between batches.
		 */
		$query_args = [
			'ignore_sticky_posts' => true,
			'orderby'             => [
				$orderby => $order,
				'ID'     => $order,
			],
			'post_status'         => 'publish',
			'post_type'           => $post_types,
		];

		if ( 'meta_value' === $orderby ) {
			$query_args['meta_key'] = $meta_key; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
		}

		if ( [] !== $tax_query ) {
			// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
			$query_args['tax_query'] = array_merge( [ 'relation' => $relation ], $tax_query );
		}

		$all_search = trim( $own_search . ' ' . $search );

		if ( '' !== $all_search ) {
			$query_args['s'] = $all_search;
		}

		if ( [] !== $post_types ) {
			$posts = new Queried_Post_IDs( $query_args );
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
	 * The options of the order field: each way that a block can order the posts, with its name. Like
	 * the Query block, ordering by a meta value is an option only with meta keys to choose from.
	 *
	 * @phpstan-return array<string, string>
	 *
	 * @return string[] Names, keyed by `orderby` value.
	 */
	private function orderby_options(): array {
		$options = $this->orderby_options;

		if ( [] !== $this->meta_keys ) {
			$options['meta_value'] = __( 'Meta Value', 'wp-curate' ); // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value -- An option name, not a query argument.
		}

		return $options;
	}

	/**
	 * The options of the meta key field, as `label` and `value` pairs: an empty choice, then each
	 * meta key.
	 *
	 * @phpstan-return list<array{label: string, value: string}>
	 *
	 * @return array[]
	 */
	private function meta_key_options(): array {
		$options = [
			[
				'label' => __( 'Select', 'wp-curate' ),
				'value' => '',
			],
		];

		foreach ( $this->meta_keys as $meta_key ) {
			$options[] = [
				'label' => $meta_key,
				'value' => $meta_key,
			];
		}

		return $options;
	}

	/**
	 * The taxonomies whose terms a block can select, without any whose name another argument has.
	 *
	 * @return string[]
	 */
	private function taxonomies(): array {
		return array_values( array_diff( $this->taxonomies, self::FIXED_ARGS ) );
	}

	/**
	 * Plural name of a taxonomy, or its slug if the taxonomy is not registered.
	 *
	 * @param string $taxonomy Taxonomy slug.
	 * @return string
	 */
	private function taxonomy_name( string $taxonomy ): string {
		$name   = $taxonomy;
		$object = get_taxonomy( $taxonomy );

		if ( $object instanceof WP_Taxonomy && is_string( $object->labels->name ) ) {
			$name = $object->labels->name;
		}

		return $name;
	}
}
