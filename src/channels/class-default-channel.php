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
 *
 * A channel that reads arguments or block context cannot be the default. Only a block can give it
 * arguments, and the default applies to blocks in any context.
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

		$names = $this->names();

		if ( in_array( $this->preferred, $names, true ) ) {
			$name = $this->preferred;
		}

		if ( '' === $name && isset( $names[0] ) ) {
			$name = $names[0];
		}

		return $name;
	}

	/**
	 * The given channel name if it can be the default, or else the default.
	 *
	 * @param string $name Channel name.
	 * @return string The name, or an empty string if no channels are registered.
	 */
	public function or_default( string $name ): string {
		$out = $this->name();

		if ( in_array( $name, $this->names(), true ) ) {
			$out = $name;
		}

		return $out;
	}

	/**
	 * Names of the registered channels that can be the default, in order.
	 *
	 * @return string[]
	 */
	private function names(): array {
		$names = [];

		foreach ( $this->channels->all() as $channel ) {
			if ( [] === $channel->arg_fields() && [] === $channel->uses_context() ) {
				$names[] = $channel->name();
			}
		}

		return $names;
	}
}
