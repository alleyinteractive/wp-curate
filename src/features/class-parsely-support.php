<?php
/**
 * Parsely_Support class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;
use Parsely\RemoteAPI\Analytics_Posts_API;

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
	 * @return array<number> An array of post IDs.
	 */
	public function get_trending_posts( array $args ): array {
		// TODO: Add failover if we're not on production.
		/**
		 * Filter the period start for the Parsely API.
		 *
		 * @param string $period_start The period start.
		 * @return string The period start.
		 */
		$period_start = apply_filters( 'wp_curate_parsely_period_start', '1d' );
		$parsely_args = [
			'limit'        => $args['posts_per_page'],
			'sort'         => 'views',
			'period_start' => $period_start,
			'period_end'   => 'now',
		];
		if ( isset( $args['tax_query'] ) && is_array( $args['tax_query'] ) ) {
			foreach ( $args['tax_query'] as $tax_query ) {
				if ( isset( $tax_query['taxonomy'] ) && 'category' === $tax_query['taxonomy'] ) {
					$parsely_args['section'] = implode( ', ', $this->get_slugs_from_term_ids( $tax_query['terms'], $tax_query['taxonomy'] ) );
				}
				if ( isset( $tax_query['taxonomy'] ) && 'post_tag' === $tax_query['taxonomy'] ) {
					$parsely_args['tag'] = implode( ', ', $this->get_slugs_from_term_ids( $tax_query['terms'], $tax_query['taxonomy'] ) );
				}
			}
		}
		$cache_key = 'parsely_trending_posts_' . md5( wp_json_encode( $parsely_args ) ); // @phpstan-ignore-line - wp_Json_encode not likely to return false.
		$ids       = wp_cache_get( $cache_key );
		if ( false === $ids ) {
			$api   = new Analytics_Posts_API( $GLOBALS['parsely'] ); // @phpstan-ignore-line
			$posts = $api->get_posts_analytics( $parsely_args ); // @phpstan-ignore-line
			$ids   = array_map(
				function ( $post ) {
					// Check if the metadata contains post_id, if not, use the URL to get the post ID.
					$metadata = json_decode( $post['metadata'] ?? '', true );
					if ( is_array( $metadata ) && ! empty( $metadata ) && isset( $metadata['post_id'] ) ) {
						$post_id = intval( $metadata['post_id'] );
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
					 * @return int The post ID.
					 */
					return apply_filters( 'wp_curate_parsely_post_to_post_id', $post_id, $post );
				},
				$posts
			);
			wp_cache_set( $cache_key, $ids, '', 10 * MINUTE_IN_SECONDS );
		}
		$ids = array_map( 'intval', $ids ); // @phpstan-ignore-line

		return( $ids );
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
