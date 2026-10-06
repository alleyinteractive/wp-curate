<?php
/**
 * Parsely_Support class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;
use Parsely\RemoteAPI\Analytics_Posts_API;
use Parsely\Parsely;

/**
 * Add support for Parsely, if the plugin is installed.
 */
final class Parsely_Support implements Feature {
	/**
	 * Set up.
	 */
	public function __construct() {}

	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		if ( ! class_exists( 'Parsely\Parsely' ) ) {
			return;
		}
		// Elsewhere in the plugin, we'll use $GLOBALS['parsely'], but it is not available here.
		$parsely = new \Parsely\Parsely();
		// If we don't have the API secret, we can't use the Parsely API.
		if ( ! $parsely->api_secret_is_set() ) {
			return;
		}
		add_filter( 'wp_curate_use_parsely', '__return_true' );
		add_filter( 'wp_curate_trending_posts_query', [ $this, 'add_parsely_trending_posts_query' ], 10, 2 );
	}

	/**
	 * Gets the trending posts from Parsely.
	 *
	 * @param array<number>        $posts The posts, which should be an empty array.
	 * @param array<string, mixed> $args The WP_Query args.
	 * @return array<number> Array of post IDs.
	 */
	public function add_parsely_trending_posts_query( $posts, $args ): array {
		global $parsely;

		if ( ! class_exists( '\Parsely\Parsely' ) || empty( $parsely ) || ! $parsely instanceof Parsely || ! $parsely->api_secret_is_set() ) {
			return $posts;
		}
		$trending_posts = $this->get_trending_posts( $args );
		return $trending_posts;
	}

	/**
	 * Gets the trending posts from Parsely.
	 *
	 * @param array<string, mixed> $args The WP_Query args.
	 * @return array<int> An array of post IDs.
	 */
	public function get_trending_posts( array $args ): array {
		global $parsely;
		if ( ! class_exists( '\Parsely\Parsely' ) || ! isset( $parsely ) || ! $parsely instanceof Parsely ) {
			return [];
		}
		if ( ! $parsely->api_secret_is_set() ) {
			return [];
		}
		if ( ! method_exists( $parsely, 'get_content_api' ) && ! class_exists( '\Parsely\RemoteAPI\Analytics_Posts_API' ) ) {
			return [];
		}

		$parsely_options = $parsely->get_options();
		/**
		 * Filter the period start for the Parsely API.
		 *
		 * @param string $period_start The period start.
		 * @param array<string, mixed> $args The WP_Query args.
		 */
		$period_start = apply_filters( 'wp_curate_parsely_period_start', '1d', $args );
		/**
		 * Filter the period end for the Parsely API.
		 *
		 * @param string $period_end The period end.
		 * @param array<string, mixed> $args The WP_Query args.
		 */
		$period_end   = apply_filters( 'wp_curate_parsely_period_end', 'now', $args );
		$parsely_args = [
			'limit'        => $args['posts_per_page'] ?? get_option( 'posts_per_page' ),
			'sort'         => 'views',
			'period_start' => $period_start,
			'period_end'   => $period_end,
		];
		if ( isset( $args['tax_query'] ) && is_array( $args['tax_query'] ) ) {
			foreach ( $args['tax_query'] as $tax_query ) {
				if ( isset( $tax_query['taxonomy'] ) && $parsely_options['custom_taxonomy_section'] === $tax_query['taxonomy'] ) {
					$parsely_args['section'] = implode( ', ', $this->get_slugs_from_term_ids( $tax_query['terms'], $tax_query['taxonomy'] ) );
				}
				if ( isset( $tax_query['taxonomy'] ) && 'post_tag' === $tax_query['taxonomy'] ) {
					$parsely_args['tag'] = implode( ', ', $this->get_slugs_from_term_ids( $tax_query['terms'], $tax_query['taxonomy'] ) );
				}
			}
			if ( $parsely_options['cats_as_tags'] ) {
				$tags                = explode( ', ', $parsely_args['tag'] ?? '' );
				$sections            = explode( ', ', $parsely_args['section'] ?? '' );
				$parsely_args['tag'] = implode( ', ', array_merge( $tags, $sections ) );
			}
		}
		$cache_key = 'parsely_trending_posts_' . md5( wp_json_encode( $parsely_args ) ); // @phpstan-ignore-line - wp_Json_encode not likely to return false.
		$ids       = wp_cache_get( $cache_key );
		if ( false === $ids || ! is_array( $ids ) ) {
			if ( method_exists( $parsely, 'get_content_api' ) ) {
				$parsely_version  = defined( 'Parsely\PARSELY_VERSION' ) ? (string) constant( 'Parsely\PARSELY_VERSION' ) : '3.17.0';
				$content_api_args = $this->get_content_api_args( $parsely_args, $parsely_version );
				$posts            = $parsely->get_content_api()->get_posts( $content_api_args );
			} else {
				$api   = new Analytics_Posts_API( $parsely );
				$posts = $api->get_posts_analytics( $parsely_args );
			}

			if ( \is_wp_error( $posts ) || ! \is_array( $posts ) ) {
				return [];
			}
			$ids = array_map(
				function ( $post ) {
					$post_id = function_exists( 'wpcom_vip_url_to_postid' )
						? wpcom_vip_url_to_postid( $post['url'] )
						: url_to_postid( $post['url'] ); // phpcs:ignore WordPressVIPMinimum.Functions.RestrictedFunctions.url_to_postid_url_to_postid
					/**
					 * Filters the post ID derived from Parsely post object.
					 *
					 * @param int $post_id The post ID.
					 * @param array $post The Parsely post object.
					 */
					return apply_filters( 'wp_curate_parsely_post_to_post_id', $post_id, $post );
				},
				$posts
			);
			/**
			 * Filters the cache duration for the trending posts from Parsely.
			 *
			 * @param int $cache_duration The cache duration.
			 * @param array<string, mixed> $args The WP_Query args.
			 */
			$cache_duration = apply_filters( 'wp_curate_parsely_trending_posts_cache_duration', 10 * MINUTE_IN_SECONDS, $args );
			if ( 300 > $cache_duration ) {
				$cache_duration = 300;
			}
			wp_cache_set( $cache_key, $ids, '', $cache_duration ); // phpcs:ignore WordPressVIPMinimum.Performance.LowExpiryCacheTime.CacheTimeUndetermined
		}

		/**
		 * Filters the trending posts from Parsely.
		 *
		 * @param array<int> $ids The list of post IDs.
		 * @param array<string, mixed> $parsely_args The Parsely API args.
		 * @param array<string, mixed> $args The WP_Query args.
		 */
		$ids = apply_filters( 'wp_curate_parsely_trending_posts', $ids, $parsely_args, $args );

		return $ids;
	}

	/**
	 * Convert legacy Analytics API arguments for the Content API service.
	 *
	 * Parse.ly 3.17 replaced Analytics_Posts_API with the Content API service.
	 * Versions 3.17 through 3.20.3 require tag and section filters to be arrays,
	 * while version 3.20.4 changed section back to a scalar value.
	 *
	 * @param array<string, mixed> $args The legacy API arguments.
	 * @param string               $parsely_version The installed Parse.ly version.
	 * @return array<string, mixed> The Content API arguments.
	 */
	private function get_content_api_args( array $args, string $parsely_version ): array {
		if ( isset( $args['tag'] ) ) {
			$args['tag'] = $this->get_api_argument_values( $args['tag'] );
		}

		if ( isset( $args['section'] ) && version_compare( $parsely_version, '3.20.4', '<' ) ) {
			$args['section'] = $this->get_api_argument_values( $args['section'] );
		}

		return $args;
	}

	/**
	 * Convert a comma-separated API argument into individual values.
	 *
	 * @param mixed $value The API argument value.
	 * @return array<string> The individual non-empty values.
	 */
	private function get_api_argument_values( mixed $value ): array {
		$values = is_array( $value ) ? $value : explode( ',', (string) $value );
		$values = array_map( static fn ( mixed $item ): string => trim( (string) $item ), $values );

		return array_values( array_filter( $values, static fn ( string $item ): bool => '' !== $item ) );
	}

	/**
	 * Get slugs from term IDs.
	 *
	 * @param array<int> $ids The list of term ids.
	 * @param string     $taxonomy The taxonomy.
	 * @return array<string> The list of term slugs.
	 */
	private function get_slugs_from_term_ids( $ids, $taxonomy ) {
		$terms = array_filter(
			array_map(
				function ( $id ) use ( $taxonomy ) {
					$term = get_term( $id, $taxonomy );
					if ( $term instanceof \WP_Term ) {
						return $term->slug;
					}
				},
				$ids
			)
		);
		return $terms;
	}
}
