<?php
/**
 * Queues_Block_Context class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;
use Alley\WP\WP_Curate\Channels\Queues;

/**
 * Gives blocks the channel queues for the request, as block context.
 *
 * A block that declares `wp-curate/queues` in `usesContext` can take IDs from the queues.
 */
final readonly class Queues_Block_Context implements Feature {
	/**
	 * Constructor.
	 *
	 * @param Queues $queues The channel queues for the request.
	 */
	public function __construct(
		private Queues $queues,
	) {}

	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_filter( 'render_block_context', [ $this, 'filter_render_block_context' ] );
	}

	/**
	 * Filters the default context provided to a rendered block.
	 *
	 * @phpstan-param mixed $context
	 *
	 * @param array $context Default context.
	 * @return mixed
	 */
	public function filter_render_block_context( $context ) {
		if ( is_array( $context ) ) {
			$context['wp-curate/queues'] = $this->queues;
		}

		return $context;
	}
}
