<?php
/**
 * Must_Include_Curated_Posts class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

use WP_Block_Type;

/**
 * Stop the query via context if it isn't going to 'include' any posts.
 */
final class Must_Include_Curated_Posts implements Curated_Posts {
	/**
	 * Set up.
	 *
	 * @param string        $qv     The query var to stop queries.
	 * @param Curated_Posts $origin The curated posts.
	 */
	public function __construct(
		private readonly string $qv,
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
		$context                       = $this->origin->with_query_context( $context, $attributes, $block_type );
		$context['query'][ $this->qv ] = ! isset( $context['query']['include'] ) || ! is_countable( $context['query']['include'] ) || count( $context['query']['include'] ) === 0;

		return $context;
	}
}
