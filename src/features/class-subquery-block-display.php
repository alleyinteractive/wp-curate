<?php
/**
 * Subquery_Block_Display class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;

/**
 * Handles displaying the subquery block only once.
 */
final class Subquery_Block_Display implements Feature {
	/**
	 * Set up.
	 */
	public function __construct() {}

	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_filter( 'pre_render_block', [ $this, 'filter_pre_render_block' ], 10, 3 );
	}

	/**
	 * Current subquery block unique id.
	 * @var string | null
	 */
	private $current_unique_id = null;

	/**
	 * Filters the block content before it is rendered.
	 *
	 * @param string $block_content The block content.
	 * @param array $parsed_block The block object.
	 * @param WP_Block $parent_block The parent block object.
	 * @return string The block content.
	 */
	public function filter_pre_render_block( string | null $block_content, array $parsed_block, \WP_Block | null $parent_block ): string | null {
		if ( 'wp-curate/subquery' !== $parsed_block['blockName'] ) {
			return $block_content;
		}

		// Only render the subquery block once per set of posts inside a post template block.
		if ( $this->current_unique_id !== $parsed_block['attrs']['uniqueId'] ) {
			$this->current_unique_id = $parsed_block['attrs']['uniqueId'];
			return $block_content;
		}

		return ' ';

		return $block_content;
	}
}
