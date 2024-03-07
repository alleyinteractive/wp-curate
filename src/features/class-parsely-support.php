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
	public function add_parsely_trending_posts_query( array $posts, array $args ): array {
		$parsely = $GLOBALS['parsely'];
		if ( ! $parsely->api_secret_is_set() ) {
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
		if ( ! class_exists( '\Parsely\Parsely' ) || ! isset( $GLOBALS['parsely'] ) || ! $GLOBALS['parsely'] instanceof Parsely ) {
			return [];
		}
		if ( ! class_exists( '\Parsely\RemoteAPI\Analytics_Posts_API' ) ) {
			return [];
		}

		$parsely_options = $GLOBALS['parsely']->get_options();
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
			$api   = new Analytics_Posts_API( $GLOBALS['parsely'] );
			$posts = $api->get_posts_analytics( $parsely_args );
			$ids   = array_map(
				function ( $post ) {
					// Check if the metadata contains post_id, if not, use the URL to get the post ID.
					$metadata = json_decode( $post['metadata'] ?? '', true );
					if ( is_array( $metadata ) && isset( $metadata['post_id'] ) ) {
						$post_id = (int) $metadata['post_id'];
					} elseif ( function_exists( 'wpcom_vip_url_to_postid' ) ) {
						$post_id = wpcom_vip_url_to_postid( $post['url'] );
					} else {
						$post_id = url_to_postid( $post['url'] ); // phpcs:ignore WordPressVIPMinimum.Functions.RestrictedFunctions.url_to_postid_url_to_postid
					}
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
