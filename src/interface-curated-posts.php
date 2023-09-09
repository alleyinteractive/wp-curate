<?php
/**
 * Curated_Posts interface file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

use WP_Block_Type;

/**
 * The posts that match block attributes.
 */
interface Curated_Posts {
	/**
	 * Populate query block context from curation fields.
	 *
	 * @param array<string, mixed> $context    Query block context.
	 * @param array<string, mixed> $attributes Curation field settings.
	 * @param WP_Block_Type        $block_type Block type.
	 * @return array{"query": array<string, mixed>} Updated context.
	 */
	public function with_query_context( array $context, array $attributes, WP_Block_Type $block_type ): array;
}
