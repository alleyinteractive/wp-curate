<?php
/**
 * GraphQL class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;
use WPGraphQL\AppContext;
use GraphQL\Type\Definition\ResolveInfo;
use WPGraphQL\Data\Connection\PostObjectConnectionResolver;

/**
 * Add support for GraphQL, if WPGraphQL plugin exists.
 */
final class GraphQL implements Feature {
	/**
	 * Post types allowed in GraphQL.
	 *
	 * @var string[]
	 */
	private $allowed_post_types;

	/**
	 * Get the GraphQL Type by Post Type.
	 *
	 * @param  string $post_type_string Name of the post type. Ex: 'post'.
	 *
	 * @return string GraphQL Type name. Ex: 'Post'.
	 */
	private function get_graphql_type_by_post_type( string $post_type_string ): string {
		$post_type_object = get_post_type_object( $post_type_string );

		// Only return a GraphQL type for allowed post types in WP Curate.
		if ( ! in_array( $post_type_string, $this->allowed_post_types, true ) ) {
			return '';
		}

		if ( empty( $post_type_object ) ) {
			return '';
		}

		// @phpstan-ignore-next-line
		return ucfirst( $post_type_object->graphql_single_name );
	}

	/**
	 * Get GraphQL Types from allowed post types.
	 *
	 * @return array<string>
	 */
	private function get_types_from_allowed_post_types(): array {
		$interface_to_types = [];

		foreach ( $this->allowed_post_types as $post_type ) {
			$interface_to_types[] = $this->get_graphql_type_by_post_type( $post_type );
		}

		return $interface_to_types;
	}

	/**
	 * Set up.
	 */
	public function __construct() {
		$this->allowed_post_types = apply_filters( 'wp_curate_allowed_post_types', [ 'post' ] );
	}

	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_action( 'graphql_register_types', [ $this, 'graphql_register_types' ] );
	}

	/**
	 * Register types in WPGraphQL
	 *
	 * @return void
	 */
	public function graphql_register_types(): void {

		/**
		 * Add an Interface Type for WP Curate to the registry.
		 *
		 * @see https://www.wpgraphql.com/functions/register_graphql_interface_type
		 */
		register_graphql_interface_type( // @phpstan-ignore-line
			'WPCurateInterface',
			[
				'description' => __( 'Represents the interface type a WP Curate post', 'wp-curate' ),
				'interfaces'  => [ 'ContentNode', 'NodeWithTitle', 'NodeWithFeaturedImage' ],
				'fields'      => [],
				'resolveType' => function ( $node ) {
					return $this->get_graphql_type_by_post_type( $node->post_type );
				},
			]
		);


		/**
		 * Apply the WP Curate interface to registered GraphQL Types.
		 * Types can be filtered to include project specific custom post types.
		 *
		 * @see https://www.wpgraphql.com/functions/register_graphql_interfaces_to_types
		 */
		register_graphql_interfaces_to_types( [ 'WPCurateInterface' ], $this->get_types_from_allowed_post_types() ); // @phpstan-ignore-line

		/**
		 * Register a new connection field named 'wpCuratePosts' on `RootQuery`
		 * to access WP Curate posts. Supports Inline Fragments when constructing
		 * your GraphQL query.
		 *
		 * @see https://www.wpgraphql.com/functions/register_graphql_connection
		 */
		register_graphql_connection( // @phpstan-ignore-line
			[
				'fromType'       => 'RootQuery',
				'toType'         => 'WPCurateInterface',
				'fromFieldName'  => 'wpCuratePosts',
				'connectionArgs' => [
					'in' => [
						'type'        => [ 'list_of' => 'ID' ],
						'description' => __( 'Array of IDs for the objects to retrieve', 'wp-curate' ),
					],
				],
				'resolve'        => function ( $source, $args, AppContext $context, ResolveInfo $info ) { // @phpstan-ignore-line
					$resolver = new PostObjectConnectionResolver( $source, $args, $context, $info ); // @phpstan-ignore-line

					$resolver->set_query_arg( 'post__in', $args['where']['in'] ); // @phpstan-ignore-line
					$resolver->set_query_arg( 'post_type', $this->allowed_post_types ); // @phpstan-ignore-line

					return $resolver->get_connection(); // @phpstan-ignore-line
				},
			],
		);
	}
}
