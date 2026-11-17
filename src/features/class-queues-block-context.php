<?php
/**
 * Queues_Block_Context class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;
use Alley\WP\WP_Curate\Channels\Queues;
use WP_Block_Type;
use WP_Block_Type_Registry;

/**
 * Gives the channel queues for the request, as block context, to the blocks that use them.
 *
 * Only a block whose type declares `wp-curate/queues` in `usesContext` gets the queues, and it can take IDs from them.
 * Other blocks do not get the queues, so they cannot give them to the blocks inside them.
 */
final readonly class Queues_Block_Context implements Feature {

	/**
	 * Constructor.
	 *
	 * @param Queues                 $queues              The channel queues for the request.
	 * @param WP_Block_Type_Registry $block_type_registry Core block type registry.
	 */
	public function __construct(
		private Queues $queues,
		private WP_Block_Type_Registry $block_type_registry,
	) {}

	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_filter( 'render_block_context', [ $this, 'filter_render_block_context' ], 10, 2 );
	}

	/**
	 * Filters the default context provided to a rendered block to give it the channel queues, if it uses them.
	 *
	 * @phpstan-param mixed $context
	 * @phpstan-param mixed $parsed_block
	 *
	 * @param array $context      Default context.
	 * @param array $parsed_block An associative array of the block being rendered.
	 * @return mixed
	 */
	public function filter_render_block_context( $context, $parsed_block ) {
		if (
			! is_array( $context )
			|| ! is_array( $parsed_block )
			|| ! isset( $parsed_block['blockName'] )
			|| ! is_string( $parsed_block['blockName'] )
		) {
			return $context;
		}

		$block_type = $this->block_type_registry->get_registered( $parsed_block['blockName'] );

		if ( $block_type instanceof WP_Block_Type && in_array( 'wp-curate/queues', $block_type->get_uses_context(), true ) ) {
			$context['wp-curate/queues'] = $this->queues;
		}

		return $context;
	}
}
