<?php
/**
 * Block Name: Subquery.
 *
 * @package wp-curate
 */

/**
 * Registers the wp-curate/subquery block using the metadata loaded from the `block.json` file.
 */
function subquery_subquery_block_init(): void {
	// Register the block by passing the location of block.json.
	register_block_type(
		__DIR__
	);
}
add_action( 'init', 'subquery_subquery_block_init' );
