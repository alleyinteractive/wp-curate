<?php
/**
 * Bundled_Channels class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;
use Alley\WP\WP_Curate\Channels\Channel;
use Alley\WP\WP_Curate\Channels\Free_For_All;
use Alley\WP\WP_Curate\Channels\Latest_Posts;
use Alley\WP\WP_Curate\Channels\Latest_Posts_In_Term;
use Alley\WP\WP_Curate\Channels\Parsely_Trending_Posts;

/**
 * Adds the channels that come with WP Curate.
 */
final readonly class Bundled_Channels implements Feature {
	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_filter( 'wp_curate_channels', [ $this, 'filter_wp_curate_channels' ] );
	}

	/**
	 * Filters the channels that blocks can use to add the bundled channels.
	 *
	 * The bundled channels come before the channels of other plugins, whatever the priority of
	 * their filters.
	 *
	 * @phpstan-param mixed $channels
	 *
	 * @param Channel[] $channels The channels, in order.
	 * @return mixed
	 */
	public function filter_wp_curate_channels( $channels ) {
		if ( is_array( $channels ) ) {
			$bundled    = [];
			$post_types = $this->allowed_post_types();

			foreach ( $post_types as $post_type ) {
				$bundled[] = new Latest_Posts( $post_type );

				if ( is_object_in_taxonomy( $post_type, 'category' ) ) {
					$bundled[] = new Latest_Posts_In_Term( $post_type, 'category' );
				}
			}

			if ( $this->uses_parsely() ) {
				// 50 posts is enough for several blocks on a page, with room for posts that the channel removes.
				$bundled[] = new Parsely_Trending_Posts(
					parsely: new Parsely_Support(),
					limit: 50,
					post_types: $post_types,
				);
			}

			$bundled[] = new Free_For_All(
				post_types: $post_types,
				taxonomies: $this->allowed_taxonomies(),
				orderby_options: $this->orderby_options(),
				meta_keys: $this->order_by_meta_keys(),
			);

			$channels = array_merge( $bundled, $channels );
		}

		return $channels;
	}

	/**
	 * Whether the Query block can order posts by trending, which `Parsely_Support` allows when
	 * Parse.ly is active and set up.
	 *
	 * @return bool
	 */
	private function uses_parsely(): bool {
		/** This filter is documented in blocks/query/index.php */
		$filtered = apply_filters( 'wp_curate_use_parsely', false );

		return true === $filtered;
	}

	/**
	 * The same registered post types that the Query block allows.
	 *
	 * @return string[]
	 */
	private function allowed_post_types(): array {
		/** This filter is documented in blocks/query/index.php */
		$filtered = apply_filters( 'wp_curate_allowed_post_types', [ 'post' ] );

		if ( ! is_array( $filtered ) ) {
			$filtered = [];
		}

		$strings    = array_filter( $filtered, 'is_string' );
		$registered = array_filter( $strings, 'post_type_exists' );
		$unique     = array_unique( $registered );

		return array_values( $unique );
	}

	/**
	 * The same registered taxonomies that the Query block allows.
	 *
	 * @return string[]
	 */
	private function allowed_taxonomies(): array {
		/** This filter is documented in blocks/query/index.php */
		$filtered = apply_filters( 'wp_curate_allowed_taxonomies', [ 'category', 'post_tag' ] );

		if ( ! is_array( $filtered ) ) {
			$filtered = [];
		}

		$strings    = array_filter( $filtered, 'is_string' );
		$registered = array_filter( $strings, 'taxonomy_exists' );
		$unique     = array_unique( $registered );

		return array_values( $unique );
	}

	/**
	 * The same ways to order posts that the Query block offers, with their names.
	 *
	 * @phpstan-return array<string, string>
	 *
	 * @return string[] Names, keyed by `orderby` value.
	 */
	private function orderby_options(): array {
		$options = [];

		/** This filter is documented in blocks/query/index.php */
		$filtered = apply_filters(
			'wp_curate_order_by_options',
			[
				'date'  => __( 'Date', 'wp-curate' ),
				'title' => __( 'Title', 'wp-curate' ),
			],
		);

		if ( ! is_array( $filtered ) ) {
			$filtered = [];
		}

		foreach ( $filtered as $value => $label ) {
			if ( is_string( $value ) && is_string( $label ) ) {
				$options[ $value ] = $label;
			}
		}

		return $options;
	}

	/**
	 * The same meta keys whose values the Query block can order posts by.
	 *
	 * @return string[]
	 */
	private function order_by_meta_keys(): array {
		/** This filter is documented in blocks/query/index.php */
		$filtered = apply_filters( 'wp_curate_order_by_meta_keys', [] );

		if ( ! is_array( $filtered ) ) {
			$filtered = [];
		}

		$strings = array_filter( $filtered, 'is_string' );
		$unique  = array_unique( $strings );

		return array_values( $unique );
	}
}
