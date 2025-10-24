<?php
/**
 * WP Curate Tests: Deduplication Test
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Tests\Feature;

use Alley\WP\WP_Curate\Tests\TestCase;

use function Mantle\Support\Helpers\collect;
use function Mantle\Testing\block_factory;

/**
 * Test the deduplication functionality of the plugin.
 */
class DeduplicationTest extends TestCase {
	/**
	 * Test that deduplication works across two query blocks on the same page.
	 */
	public function test_it_can_deduplicate_across_two_query_blocks(): void {
		$this->markTestIncomplete( 'This test is not yet implemented.' );
	}

	/**
	 * Test that a individual query block can disable deduplication on a per-block basis.
	 */
	public function test_it_can_override_deduplication_per_block(): void {
		$this->markTestIncomplete( 'This test is not yet implemented.' );
	}
}
