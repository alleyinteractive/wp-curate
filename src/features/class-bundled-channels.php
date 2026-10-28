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
use Alley\WP\WP_Curate\Supported_Post_Types;

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
			$post_types = array_values( array_unique( ( new Supported_Post_Types() )->get_supported_post_types() ) );

			foreach ( $post_types as $post_type ) {
				$bundled[] = new Latest_Posts( $post_type );

				if ( is_object_in_taxonomy( $post_type, 'category' ) ) {
					$bundled[] = new Latest_Posts_In_Term( $post_type, 'category' );
				}
			}

			$bundled[] = new Free_For_All( $post_types );
			$channels  = array_merge( $bundled, $channels );
		}

		return $channels;
	}
}
