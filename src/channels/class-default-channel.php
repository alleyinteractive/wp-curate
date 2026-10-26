<?php
/**
 * Default_Channel class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Channels;

/**
 * The channel that blocks use when nothing else gives them one.
 *
 * The preferred channel is the default while it is registered. Otherwise, the first registered
 * channel is. With no channels registered, there is no default; that case will be handled later.
 */
final readonly class Default_Channel {
	/**
	 * Constructor.
	 *
	 * @param Registered_Channels $channels  Available channels.
	 * @param string              $preferred Name of the preferred default channel.
	 */
	public function __construct(
		private Registered_Channels $channels,
		private string $preferred,
	) {}

	/**
	 * Name of the default channel.
	 *
	 * @return string The name, or an empty string if no channels are registered.
	 */
	public function name(): string {
		$name = '';

		if ( $this->is_registered( $this->preferred ) ) {
			$name = $this->preferred;
		}

		$channels = $this->channels->all();

		if ( '' === $name && isset( $channels[0] ) ) {
			$name = $channels[0]->name();
		}

		return $name;
	}

	/**
	 * The given channel name if it is registered, or else the default.
	 *
	 * @param string $name Channel name.
	 * @return string The name, or an empty string if no channels are registered.
	 */
	public function or_default( string $name ): string {
		$out = $this->name();

		if ( $this->is_registered( $name ) ) {
			$out = $name;
		}

		return $out;
	}

	/**
	 * Names of the registered channels.
	 *
	 * @return string[]
	 */
	public function names(): array {
		return array_map( fn ( Channel $channel ) => $channel->name(), $this->channels->all() );
	}

	/**
	 * Whether a channel with the name is registered.
	 *
	 * @param string $name Channel name.
	 * @return bool
	 */
	private function is_registered( string $name ): bool {
		return in_array( $name, $this->names(), true );
	}
}
