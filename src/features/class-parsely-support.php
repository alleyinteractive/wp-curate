<?php
/**
 * Parsely_Support class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;

/**
 * Add support for Parsely, if the plugin in installed.
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
		$parsely = new \Parsely\Parsely();
		if ( ! $parsely->api_secret_is_set() ) {
			return;
		}
		add_filter( 'wp_curate_use_parsely', '__return_true' );
		add_filter( 'wp_curate_trending_posts_query', [ $this, 'add_parsely_trending_posts_query' ], 10, 2 );
	}

	/**
	 * Gets the trending posts from Parsely.
	 *
	 * @param array $posts The posts, which should be an empty array.
	 * @param array $args The WP_Query args.
	 * @return array Array of post IDs.
	 */
	public function add_parsely_trending_posts_query( $posts, $args ) {
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
	 * @param array $args The WP_Query args.
	 * @return array An array of post IDs.
	 */
	public function get_trending_posts( $args ) {
		// TODO: Add failover if we're not on production.
		$parsely_args = [
			'limit'        => $args['posts_per_page'],
			'sort'         => 'views',
			'period_start' => '1d',
			'period_end'   => 'now',
		];
		if ( isset( $args['tax_query'] ) ) {
			foreach ( $args['tax_query'] as $tax_query ) {
				if ( isset( $tax_query['taxonomy'] ) && 'category' === $tax_query['taxonomy'] ) {
					$parsely_args['section'] = implode( ', ', $this->get_slugs_from_ids( $tax_query['terms'], $tax_query['taxonomy'] ) );
				}
				if ( isset( $tax_query['taxonomy'] ) && 'post_tag' === $tax_query['taxonomy'] ) {
					$parsely_args['tag'] = implode( ', ', $this->get_slugs_from_ids( $tax_query['terms'], $tax_query['taxonomy'] ) );
				}
			}
		}
		$cache_key = 'parsely_trending_posts_' . md5( wp_json_encode( $parsely_args ) );
		$ids       = wp_cache_get( $cache_key );
		if ( false === $ids ) {
			$api   = new \Parsely\RemoteAPI\Analytics_Posts_API( $GLOBALS['parsely'] );
			$posts = $api->get_posts_analytics( $parsely_args );
			$ids   = array_map(
				function ( $post ) {
					// Check if the metadata contains post_id, if not, use the URL to get the post ID.
					$metadata = json_decode( $post['metadata'] ?? '', true );
					if ( ! empty( $post['metadata'] ) && isset( $metadata['post_id'] ) ) {
						$post_id = intval( $metadata['post_id'] );
					} else {
						if ( function_exists( 'wpcom_vip_url_to_postid' ) ) {
							$post_id = wpcom_vip_url_to_postid( $post['url'] );
						} else {
							$post_id = url_to_postid( $post['url'] ); // phpcs:ignore WordPressVIPMinimum.Functions.RestrictedFunctions.url_to_postid_url_to_postid
						}
					}
					return $post_id;
				},
				$posts
			);
			wp_cache_set( $cache_key, $ids, '', 10 * MINUTE_IN_SECONDS );
		}

		return( $ids );
	}

	/**
	 * Get slugs from term IDs.
	 *
	 * @param array $ids The list of term ids.
	 * @param array $taxonomy The taxonomy.
	 * @return array The list of term slugs.
	 */
	private function get_slugs_from_ids( $ids, $taxonomy ) {
		$terms = array_map(
			function ( $id ) use ( $taxonomy ) {
				$term = get_term( $id, $taxonomy );
				return $term->slug;
			},
			$ids
		);
		return $terms;
	}

}
