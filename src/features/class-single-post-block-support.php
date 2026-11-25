<?php
/**
 * Single_Post_Block_Support class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;

/**
 * The `wp-curate/single-post` block support.
 *
 * A block with this support shows one post from its channel. The block must also have the `wp-curate/channels` support,
 * which gives it its channel. Without that support, this support does nothing.
 *
 * The support gives the block these attributes:
 *
 * - `ref`: The ID of the pinned post, or 0 for the top of the queue.
 * - `postType`: The type of the pinned post, or an empty string.
 *
 * The block takes its post itself when it renders, like any block that shows posts from a channel. It reads its queue
 * from its `wp-curate/queue` context, and calls `Queues::take()` with `[ $ref ]`. It must take exactly one post, as
 * the queue walk in the editor does. Its own `postId` context stays the post around it, which the channel can read to
 * find its queue. See `blocks/single-post/render.php` for an example.
 *
 * In the editor, the `singlePostSupport` script gives the block its toolbar, its pin, and its placeholders. Keep the
 * rules matched with that script.
 */
final readonly class Single_Post_Block_Support implements Feature {
	/**
	 * The name of the block support.
	 *
	 * @var string
	 */
	public const SUPPORT = 'wp-curate/single-post';

	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_filter( 'register_block_type_args', [ $this, 'filter_register_block_type_args' ] );
	}

	/**
	 * Filters the arguments for registering a block type to give a block with the support its attributes.
	 *
	 * @phpstan-param mixed $args
	 *
	 * @param array $args Array of arguments for registering a block type.
	 * @return mixed
	 */
	public function filter_register_block_type_args( $args ) {
		if ( ! is_array( $args ) || ! $this->args_have_support( $args ) ) {
			return $args;
		}

		$attributes = [];

		if ( isset( $args['attributes'] ) && is_array( $args['attributes'] ) ) {
			$attributes = $args['attributes'];
		}

		$attributes['ref'] ??= [
			'type'    => 'number',
			'default' => 0,
			'role'    => 'content',
		];

		$attributes['postType'] ??= [
			'type'    => 'string',
			'default' => '',
			'role'    => 'content',
		];

		$args['attributes'] = $attributes;

		return $args;
	}

	/**
	 * Whether the arguments for registering a block type turn on the support and the `wp-curate/channels` support.
	 * Like `block_has_support()`, an array of settings also turns on a support.
	 *
	 * @param mixed[] $args Array of arguments for registering a block type.
	 * @return bool
	 */
	private function args_have_support( array $args ): bool {
		if ( ! isset( $args['supports'] ) || ! is_array( $args['supports'] ) ) {
			return false;
		}

		foreach ( [ self::SUPPORT, 'wp-curate/channels' ] as $support ) {
			if (
				! isset( $args['supports'][ $support ] )
				|| ( true !== $args['supports'][ $support ] && ! is_array( $args['supports'][ $support ] ) )
			) {
				return false;
			}
		}

		return true;
	}
}
