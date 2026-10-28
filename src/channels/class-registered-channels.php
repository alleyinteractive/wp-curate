<?php
/**
 * Registered_Channels class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

use Alley\WP\WP_Curate\Supported_Post_Types;

/**
 * The channels that blocks can use: a "Latest" channel for each supported post type, a "Latest in
 * Category" channel for each one that has categories, and the Free-For-All channel. Other plugins
 * can add channels with the `wp_curate_channels` filter.
 *
 * The list depends on the registered post types, so it is built when it is first needed, not when
 * the plugin loads.
 */
final class Registered_Channels {
	/**
	 * The channels, or null before the list is final.
	 *
	 * @var Channel[]|null
	 */
	private ?array $channels = null;

	/**
	 * The channels, in order.
	 *
	 * @return Channel[]
	 */
	public function all(): array {
		$channels = $this->channels;

		if ( null === $channels ) {
			$channels   = [];
			$post_types = array_values( array_unique( ( new Supported_Post_Types() )->get_supported_post_types() ) );

			foreach ( $post_types as $post_type ) {
				$channels[] = new Latest_Posts( $post_type );

				if ( is_object_in_taxonomy( $post_type, 'category' ) ) {
					$channels[] = new Latest_Posts_In_Term( $post_type, 'category' );
				}
			}

			$channels[] = new Free_For_All( $post_types );

			/**
			 * Filters the channels that blocks can use.
			 *
			 * A channel's name can have only lowercase letters, numbers, underscores and hyphens.
			 *
			 * @param Channel[] $channels The channels, in order.
			 */
			$channels = $this->valid( apply_filters( 'wp_curate_channels', $channels ) );
		}

		// Post types register during `init`, so keep the list only after it.
		if ( null === $this->channels && did_action( 'init' ) && ! doing_action( 'init' ) ) {
			$this->channels = $channels;
		}

		return $channels;
	}

	/**
	 * The channels that a filter returned, without values that are not channels, names that blocks
	 * cannot use, and names that an earlier channel has.
	 *
	 * @param mixed $filtered The filtered channels.
	 * @return Channel[]
	 */
	private function valid( mixed $filtered ): array {
		$channels = [];
		$names    = [];

		if ( ! is_array( $filtered ) ) {
			return $channels;
		}

		foreach ( $filtered as $channel ) {
			if (
				$channel instanceof Channel
				&& 1 === preg_match( '/^[a-z0-9_-]+$/', $channel->name() )
				&& ! isset( $names[ $channel->name() ] )
			) {
				$channels[]                = $channel;
				$names[ $channel->name() ] = true;
			}
		}

		return $channels;
	}
}
