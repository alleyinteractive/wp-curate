<?php
/**
 * Channel_Deduplication_Block_Context class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Post_IDs\Empty_Post_IDs;
use Alley\WP\Post_IDs\Memoized_Post_IDs;
use Alley\WP\Types\Feature;
use Alley\WP\Types\Post_IDs;
use Alley\WP\WP_Curate\Channels\Deduplication;
use Alley\WP\WP_Curate\Post_IDs\Pinned_In_Channel_Blocks;
use WP_Block;
use WP_Block_Type_Registry;
use WP_Post;

/**
 * Gives top-level blocks the IDs that the channel blocks in their post skip, by the post's
 * deduplication rule, as the `wp-curate/channelDeduplication` block context.
 *
 * The rule comes from the post-level settings that Query blocks also follow. Unique pinned posts
 * applies only with deduplication on, like it does for Query blocks. Core passes the context to the
 * blocks inside them. Keep the rules matched with `useChannelQueue()`.
 */
final class Channel_Deduplication_Block_Context implements Feature {
	/**
	 * The block context that holds the rule.
	 *
	 * @var string
	 */
	private const CONTEXT = 'wp-curate/channelDeduplication';

	/**
	 * The rule of each post so far, keyed by post ID, so that each post's content is read once.
	 *
	 * @var Deduplication[]
	 */
	private array $rules = [];

	/**
	 * Constructor.
	 *
	 * @param Post_IDs               $taken               The IDs that blocks took from any channel so far.
	 * @param WP_Block_Type_Registry $block_type_registry Core block type registry.
	 */
	public function __construct(
		private readonly Post_IDs $taken,
		private readonly WP_Block_Type_Registry $block_type_registry,
	) {}

	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_filter( 'render_block_context', [ $this, 'filter_render_block_context' ], 10, 3 );
	}

	/**
	 * Filters the default context provided to a rendered block.
	 *
	 * @phpstan-param mixed $context
	 * @phpstan-param mixed[] $parsed_block
	 *
	 * @param array         $context      Default context.
	 * @param array         $parsed_block {
	 *     An associative array of the block being rendered. See WP_Block_Parser_Block.
	 *
	 *     @type string|null $blockName    Name of block.
	 *     @type array       $attrs        Attributes from block comment delimiters.
	 *     @type array[]     $innerBlocks  List of inner blocks. An array of arrays that
	 *                                     have the same structure as this one.
	 *     @type string      $innerHTML    HTML from inside block comment delimiters.
	 *     @type array       $innerContent List of string fragments and null markers where
	 *                                     inner blocks were found.
	 * }
	 * @param WP_Block|null $parent_block If this is a nested block, a reference to the parent block.
	 * @return mixed
	 */
	public function filter_render_block_context( $context, $parsed_block, $parent_block ) {
		// A top-level block outside a post has no rule, so its channel blocks do not deduplicate.
		if (
			is_array( $context )
			&& ! $parent_block instanceof WP_Block
			&& isset( $context['postId'] )
			&& is_int( $context['postId'] )
		) {
			$this->rules[ $context['postId'] ] ??= $this->rule( $context['postId'] );
			$context[ self::CONTEXT ]            = $this->rules[ $context['postId'] ];
		}

		return $context;
	}

	/**
	 * The rule of a post.
	 *
	 * @param int $post_id Post ID.
	 * @return Deduplication
	 */
	private function rule( int $post_id ): Deduplication {
		$enabled = $this->meta_flag( $post_id, 'wp_curate_deduplication' );
		$unique  = $this->meta_flag( $post_id, 'wp_curate_unique_pinned_posts' );
		$pinned  = new Empty_Post_IDs();
		$post    = get_post( $post_id );

		// The content is read only when a block first needs the pinned IDs.
		if ( $enabled && $unique && $post instanceof WP_Post ) {
			$pinned = new Memoized_Post_IDs(
				new Pinned_In_Channel_Blocks( $post->post_content, $this->block_type_registry ),
			);
		}

		return new Deduplication( $enabled, $this->taken, $pinned );
	}

	/**
	 * Whether a boolean post meta setting is on.
	 *
	 * The REST API saves true as the string `'1'` and false as an empty string. A post without the
	 * meta gives its registered default, which can be `false` or an empty string. Any other value,
	 * such as a string that a script saved, is off.
	 *
	 * @param int    $post_id  Post ID.
	 * @param string $meta_key Meta key.
	 * @return bool
	 */
	private function meta_flag( int $post_id, string $meta_key ): bool {
		$value = get_post_meta( $post_id, $meta_key, true );

		return true === $value || '1' === $value;
	}
}
