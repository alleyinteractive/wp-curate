<?php
/**
 * Recorded_Curated_Posts class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

use Alley\WP\WP_Curate\Post_IDs\History;
use WP_Block_Type;

/**
 * Record the post IDs used as context.
 */
final class Recorded_Curated_Posts implements Curated_Posts {
	/**
	 * Set up.
	 *
	 * @param History       $history Post IDs to record history to.
	 * @param Curated_Posts $origin  The curated posts.
	 */
	public function __construct(
		private readonly History $history,
		private readonly Curated_Posts $origin,
	) {}

	/**
	 * Populate query block context from curation fields.
	 *
	 * @param array<string, mixed> $context    Query block context.
	 * @param array<string, mixed> $attributes Curation field settings.
	 * @param WP_Block_Type        $block_type Block type.
	 * @return array{"query": array<string, mixed>} Updated context.
	 */
	public function with_query_context( array $context, array $attributes, WP_Block_Type $block_type ): array {
		$context = $this->origin->with_query_context( $context, $attributes, $block_type );

		if ( isset( $context['query']['include'] ) && is_array( $context['query']['include'] ) ) {
			$this->history->record( $context['query']['include'] );
		}

		return $context;
	}
}
