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
use WP_Post;

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

			if ( $post instanceof WP_Post ) {
				// Unique pinned posts relies on deduplication being enabled.
				$post_level_unique        = get_post_meta( $post->ID, 'wp_curate_unique_pinned_posts', true );
				$post_level_deduplication = get_post_meta( $post->ID, 'wp_curate_deduplication', true );

				if ( $post_level_unique && $post_level_deduplication ) {
					$out = $this->collect_pinned_posts( $post->post_content );
				}
			}
		}

		$out = new Legal_Object_IDs( new Post_IDs_Envelope( $out ) );

		return $out->post_ids();
	}

	/**
	 * Collects all pinned post IDs from WP Curate blocks in the given content,
	 * resolving synced patterns (core/block) recursively.
	 *
	 * @param string $content      Block content to parse.
	 * @param int[]  $visited_refs Synced pattern post IDs already visited, to prevent infinite loops.
	 * @return int[]
	 */
	private function collect_pinned_posts( string $content, array $visited_refs = [] ): array {
		$out = [];

		// Collect pinned posts from WP Curate query blocks directly in this content.
		$query_blocks = match_blocks(
			$content,
			[
				'name'       => [ 'wp-curate/query', 'wp-curate/subquery' ],
				'flatten'    => true,
				'with_attrs' => 'posts',
			],
		);

		if ( is_array( $query_blocks ) ) {
			foreach ( $query_blocks as $block ) {
				if ( isset( $block['attrs']['posts'] ) && is_array( $block['attrs']['posts'] ) ) {
					$out = array_merge( $out, $block['attrs']['posts'] );
				}
			}
		}

		// Synced patterns store their block content in the wp_block CPT, not in the
		// post content directly, so match_blocks() won't find WP Curate blocks inside
		// them. Resolve each pattern's ref and scan its content recursively.
		$pattern_blocks = match_blocks(
			$content,
			[
				'name'    => [ 'core/block' ],
				'flatten' => true,
			],
		);

		if ( is_array( $pattern_blocks ) ) {
			foreach ( $pattern_blocks as $pattern_block ) {
				$ref_value = $pattern_block['attrs']['ref'] ?? 0;
				$ref       = is_scalar( $ref_value ) && is_numeric( $ref_value ) ? (int) $ref_value : 0;

				if ( ! $ref || in_array( $ref, $visited_refs, true ) ) {
					continue;
				}

				$pattern_post = get_post( $ref );

				if ( $pattern_post instanceof WP_Post && ! empty( $pattern_post->post_content ) ) {
					$out = array_merge(
						$out,
						$this->collect_pinned_posts( $pattern_post->post_content, [ ...$visited_refs, $ref ] ),
					);
				}
			}
		}

		return $out;
	}
}
