<?php
/**
 * Default_Channel_Meta class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;
use Alley\WP\WP_Curate\Channels\Default_Channel;
use Alley\WP\WP_Curate\Supported_Post_Types;

use function Mantle\Support\Helpers\register_meta_helper;

/**
 * The post meta that holds a post's default channel.
 *
 * A post without the meta has the global default channel. The meta can name a channel that is no
 * longer registered; blocks then use the global default when they render.
 */
final readonly class Default_Channel_Meta implements Feature {
	/**
	 * Constructor.
	 *
	 * @param Default_Channel $default_channel The global default channel.
	 * @param string          $meta_key        The post meta key.
	 */
	public function __construct(
		private Default_Channel $default_channel,
		private string $meta_key,
	) {}

	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		// After post types register, since the meta depends on them.
		add_action( 'init', [ $this, 'on_init' ], 20 );
		add_filter( 'default_post_metadata', [ $this, 'filter_default_post_metadata' ], 10, 4 );
	}

	/**
	 * Fires after WordPress has finished loading but before any headers are sent.
	 */
	public function on_init(): void {
		register_meta_helper(
			'post',
			( new Supported_Post_Types() )->get_supported_post_types(),
			$this->meta_key,
		);
	}

	/**
	 * Gives a post without the meta the global default channel.
	 *
	 * The default depends on the channels that are registered when the meta is read, so it is not
	 * set when the meta registers.
	 *
	 * @param mixed  $value     The default value.
	 * @param int    $object_id Post ID.
	 * @param string $meta_key  Meta key.
	 * @param bool   $single    Whether to return a single value.
	 * @return mixed
	 */
	public function filter_default_post_metadata( $value, $object_id, $meta_key, $single ) {
		if ( $this->meta_key !== $meta_key ) {
			return $value;
		}

		$value = $this->default_channel->name();

		if ( ! $single ) {
			$value = [ $value ];
		}

		return $value;
	}
}
