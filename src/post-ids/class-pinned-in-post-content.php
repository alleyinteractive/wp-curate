<?php

namespace Alley\WP\WP_Curate\Post_IDs;

use Alley\WP\Legal_Object_IDs;
use Alley\WP\Post_IDs\Post_IDs_Envelope;
use Alley\WP\Types\Post_IDs;
use Alley\WP\Types\Post_Query;

use function Alley\WP\match_blocks;

final class Pinned_In_Post_Content implements Post_IDs {
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
				// Imaginary meta key. Variable is made always true for demo purposes.
				$post_level_unique        = get_post_meta( $post->ID, 'wp_curate_unique_pinned_posts', true );
				$post_level_deduplication = get_post_meta( $post->ID, 'wp_curate_deduplication', true );
				$post_level_unique        = $post_level_unique && $post_level_deduplication;

				if ( true === (bool) $post_level_unique ) {
					$query_blocks = match_blocks(
						$post->post_content,
						[
							'name'       => 'wp-curate/query',
							'flatten'    => true,
							'with_attrs' => 'posts',
						],
					);

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
