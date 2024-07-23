<?php
/**
 * Pinned_In_Post_Content class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Post_IDs;

use Alley\WP\Legal_Object_IDs;
use Alley\WP\Post_IDs\Post_IDs_Envelope;
use Alley\WP\Types\Post_IDs;
use Alley\WP\Types\Post_Query;

use function Alley\WP\match_blocks;

/**
 * Post IDs from pinned posts in post content.
 */
final class Pinned_In_Post_Content implements Post_IDs {
	/**
	 * Set up.
	 *
	 * @param Post_Query $main_query The main query.
	 */
	public function __construct(
		private readonly Post_Query $main_query,
	) {}

	/**
	 * Post IDs.
	 *
	 * @return int[]
	 */
	public function post_ids(): array {
		$out        = [];
		$main_query = $this->main_query->query_object();

		if ( $main_query->is_singular() ) {
			$post = $main_query->get_queried_object();

			if ( $post instanceof \WP_Post ) {
				// Unique pinned posts relies on deduplication being enabled.
				$post_level_unique         = get_post_meta( $post->ID, 'wp_curate_unique_pinned_posts', true );
				$post_level_deduplication  = get_post_meta( $post->ID, 'wp_curate_deduplication', true );

				if ( $post_level_unique && $post_level_deduplication ) {
					$query_blocks = match_blocks(
						$post->post_content,
						[
							'name'       => 'wp-curate/query',
							'flatten'    => true,
							'with_attrs' => 'posts',
						],
					);

					if ( ! is_array( $query_blocks ) ) {
						return [];
					}

					foreach ( $query_blocks as $block ) {
						if ( isset( $block['attrs']['posts'] ) && is_array( $block['attrs']['posts'] ) ) {
							$out = array_merge( $out, $block['attrs']['posts'] );
						}
					}
				}
			}
		}

		$out = new Legal_Object_IDs( new Post_IDs_Envelope( $out ) );

		return $out->post_ids();
	}
}
