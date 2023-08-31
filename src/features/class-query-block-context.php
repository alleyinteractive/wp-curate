<?php
/**
 * Query_Block_Context class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\WP_Curate\Curated_Posts;
use Alley\WP\WP_Curate\Feature;

/**
 * Provides context to query blocks based on the homepage settings.
 */
final class Query_Block_Context implements Feature {
	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_filter( 'render_block_context', [ $this, 'filter_query_context' ], 10, 2 );
	}

	/**
	 * Filters the context provided to a 'wp-curate/query' block.
	 *
	 * @param array $context      Default context.
	 * @param array $parsed_block Block being rendered.
	 * @return array Updated context.
	 */
	public function filter_query_context( $context, $parsed_block ) {
		$curated  = new Curated_Posts();
		$registry = \WP_Block_Type_Registry::get_instance();

		$block_type = $registry->get_registered( 'wp-curate/query' );

		if (
			! $block_type instanceof \WP_Block_Type
			|| ! isset( $parsed_block['blockName'] )
			|| $block_type->name !== $parsed_block['blockName']
		) {
			return $context;
		}

		$context = $curated->as_query_context( $context, $parsed_block['attrs'], $block_type );

		return $context;
	}
}
