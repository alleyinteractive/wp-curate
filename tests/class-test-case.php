<?php
/**
 * WP Curate Tests: Base Test Class
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Tests;

use Mantle\Testing\Concerns\Refresh_Database;
use Mantle\Testkit\Test_Case as TestkitTest_Case;

/**
 * WP Curate Base Test Case
 */
abstract class Test_Case extends TestkitTest_Case {
	use Refresh_Database;
}
