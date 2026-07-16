<?php
/**
 * WP Curate Tests: REST API Backfill Days Test
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Tests\Feature;

use Alley\WP\WP_Curate\Tests\TestCase;
use WP_Post;

use function Mantle\Support\Helpers\collect;
use function Mantle\Support\Helpers\now;

/**
 * Test the backfill_days parameter on the wp-curate/v1/posts REST endpoint.
 */
class RestApiBackfillDaysTest extends TestCase {
	/**
	 * Authenticate as an editor before each test (endpoint requires is_user_logged_in).
	 */
	protected function setUp(): void {
		parent::setUp();
		$this->acting_as( 'editor' );
	}

	/**
	 * Test that posts older than the backfill_days limit are excluded from results.
	 */
	public function test_backfill_days_param_excludes_old_posts(): void {
		$recent_post = static::factory()->post->create_and_get();
		$old_post    = static::factory()->post->create_and_get( [
			'post_date' => now()->subDays( 60 )->toDateTimeString(),
		] );

		$ids = $this->get_json( '/wp-json/wp-curate/v1/posts?backfill_days=30' )
			->assertOk()
			->json();

		$this->assertContains( $recent_post->ID, $ids );
		$this->assertNotContains( $old_post->ID, $ids );
	}

	/**
	 * Test that backfill_days=0 disables the date limit and returns all posts.
	 */
	public function test_zero_backfill_days_disables_date_limit(): void {
		$old_post = static::factory()->post->create_and_get( [
			'post_date' => now()->subDays( 365 )->toDateTimeString(),
		] );

		$ids = $this->get_json( '/wp-json/wp-curate/v1/posts?backfill_days=0' )
			->assertOk()
			->json();

		$this->assertContains( $old_post->ID, $ids );
	}

	/**
	 * Test that the wp_curate_backfill_days filter overrides the request param.
	 *
	 * The request sends backfill_days=30, but a filter widens it to 90 days.
	 * A post from 60 days ago should appear because the filter wins.
	 */
	public function test_backfill_days_filter_overrides_request_param(): void {
		$mid_range_post = static::factory()->post->create_and_get( [
			'post_date' => now()->subDays( 60 )->toDateTimeString(),
		] );

		$filter = fn () => 90;
		add_filter( 'wp_curate_backfill_days', $filter );

		$ids = $this->get_json( '/wp-json/wp-curate/v1/posts?backfill_days=30' )
			->assertOk()
			->json();

		remove_filter( 'wp_curate_backfill_days', $filter );

		$this->assertContains( $mid_range_post->ID, $ids );
	}

	/**
	 * Test that the endpoint requires authentication.
	 */
	public function test_endpoint_requires_authentication(): void {
		wp_set_current_user( 0 );

		$this->get_json( '/wp-json/wp-curate/v1/posts' )
			->assertUnauthorized();
	}
}
