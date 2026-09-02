<?php
/**
 * WP Curate Tests: Backfill Date Limit Test
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Tests\Unit;

use Alley\WP\WP_Curate\Backfill_Date_Limit;
use PHPUnit\Framework\TestCase;

/**
 * Test the precedence and normalization logic in Backfill_Date_Limit::resolve().
 *
 * @link https://mantle.alley.com/testing/test-framework.html
 */
class BackfillDateLimitTest extends TestCase {
	/**
	 * Remove any filters added by a test.
	 */
	protected function tearDown(): void {
		remove_all_filters( 'wp_curate_backfill_date_limit' );

		parent::tearDown();
	}

	/**
	 * When the block attribute is left at "default" and no filter is registered, the built-in
	 * 30-day default applies.
	 */
	public function test_default_attribute_with_no_filter_resolves_to_thirty_days(): void {
		$this->assertSame( 30, Backfill_Date_Limit::resolve( 'default' ) );
	}

	/**
	 * When the block attribute is left at "default", the sitewide filter supplies the value.
	 */
	public function test_default_attribute_uses_filtered_value(): void {
		add_filter( 'wp_curate_backfill_date_limit', fn () => 90 );

		$this->assertSame( 90, Backfill_Date_Limit::resolve( 'default' ) );
	}

	/**
	 * An explicit per-block choice is never overridden by the sitewide filter.
	 */
	public function test_explicit_attribute_bypasses_the_filter(): void {
		add_filter( 'wp_curate_backfill_date_limit', fn () => 30 );

		$this->assertSame( 90, Backfill_Date_Limit::resolve( '90' ) );
	}

	/**
	 * An explicit "unlimited" attribute always resolves to unlimited, filter or not.
	 */
	public function test_explicit_unlimited_attribute_resolves_to_unlimited(): void {
		add_filter( 'wp_curate_backfill_date_limit', fn () => 30 );

		$this->assertSame( Backfill_Date_Limit::UNLIMITED, Backfill_Date_Limit::resolve( 'unlimited' ) );
	}

	/**
	 * A filter returning 'unlimited' disables date-limiting by default.
	 */
	public function test_filter_returning_unlimited_resolves_to_unlimited(): void {
		add_filter( 'wp_curate_backfill_date_limit', fn () => 'unlimited' );

		$this->assertSame( Backfill_Date_Limit::UNLIMITED, Backfill_Date_Limit::resolve( 'default' ) );
	}

	/**
	 * A filter returning zero or a negative number is treated as unlimited.
	 */
	public function test_filter_returning_non_positive_number_resolves_to_unlimited(): void {
		add_filter( 'wp_curate_backfill_date_limit', fn () => -5 );

		$this->assertSame( Backfill_Date_Limit::UNLIMITED, Backfill_Date_Limit::resolve( 'default' ) );
	}
}
