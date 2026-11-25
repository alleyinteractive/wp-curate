<?php
/**
 * Available_Channels class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

/**
 * The channels that blocks can use.
 */
final class Available_Channels {
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
			$channels = [];
			$last     = [];
			$names    = [];

			/**
			 * Filters the channels that blocks can use.
			 *
			 * A channel must have a nonempty name consisting of lowercase letters, numbers, underscores and hyphens.
			 * The Free-For-All channel is always last, whatever its position in the filtered list.
			 *
			 * @param Channel[] $channels The channels, in order.
			 */
			$filtered = apply_filters( 'wp_curate_channels', [] );

			if ( ! is_array( $filtered ) ) {
				$filtered = [];
			}

			// Leave out values that are not channels, empty names, names that blocks cannot use, and names that were taken.
			foreach ( $filtered as $channel ) {
				if ( $channel instanceof Channel ) {
					$name = $channel->name();

					if ( ! isset( $names[ $name ] ) && '' !== $name && preg_match( '/^[a-z0-9_-]+\z/', $name ) === 1 ) {
						$names[ $name ] = true;

						if ( 'wp_curate_free_for_all' === $name ) {
							$last[] = $channel;
						} else {
							$channels[] = $channel;
						}
					}
				}
			}

			$channels = array_merge( $channels, $last );
		}

		// Post types register during `init`, so keep the list only after it.
		if ( null === $this->channels && ! doing_action( 'init' ) && did_action( 'init' ) ) {
			$this->channels = $channels;
		}

		return $channels;
	}
}
