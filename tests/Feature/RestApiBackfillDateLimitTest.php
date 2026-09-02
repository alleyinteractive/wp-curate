<?php
/**
 * WP Curate Tests: REST API Backfill Date Limit Test
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Tests\Feature;

use Alley\WP\WP_Curate\Tests\TestCase;

/**
 * Test that the `wp-curate/v1/posts/` REST endpoint (used to populate the editor's
 * `backfillPosts` preview) honors the `backfill_date_limit` parameter, for editor-preview
 * parity with the server-side rendered behavior.
 */
class RestApiBackfillDateLimitTest extends TestCase {
	/**
	 * Remove any filters added by a test.
	 */
	protected function tearDown(): void {
		remove_all_filters( 'wp_curate_backfill_date_limit' );

		parent::tearDown();
	}

	/**
	 * Create a post published a given number of days ago.
	 *
	 * @param string $title Post title.
	 * @param int    $days_ago Number of days ago the post was published.
	 * @return \WP_Post
	 */
	private function create_post_days_ago( string $title, int $days_ago ) {
		return static::factory()->post->create_and_get( [
			'post_title' => $title,
			'post_date'  => gmdate( 'Y-m-d H:i:s', time() - $days_ago * DAY_IN_SECONDS ),
		] );
	}

	/**
	 * When the `backfill_date_limit` param is omitted, results are limited to the default
	 * 30-day window.
	 *
	 * `per_page` is pinned to the number of recent posts so the date-limited query is treated as
	 * having returned enough posts and the optimistic fallback to an unconstrained query (see
	 * test_falls_back_to_unlimited_when_not_enough_recent_posts) doesn't kick in.
	 */
	public function test_omitted_param_limits_results_to_the_default_window(): void {
		$this->acting_as( 'administrator' );

		$recent = $this->create_post_days_ago( 'Recent Post', 10 );
		$old    = $this->create_post_days_ago( 'Old Post', 60 );

		$ids = $this->get_json( '/wp-json/wp-curate/v1/posts/?post_type=post&per_page=1' )
			->assertOk()
			->json();

		$this->assertContains( $recent->ID, $ids );
		$this->assertNotContains( $old->ID, $ids );
	}

	/**
	 * An explicit `backfill_date_limit=unlimited` param disables date-limiting entirely.
	 */
	public function test_explicit_unlimited_param_includes_older_posts(): void {
		$this->acting_as( 'administrator' );

		$old = $this->create_post_days_ago( 'Old Post', 400 );

		$ids = $this->get_json( '/wp-json/wp-curate/v1/posts/?post_type=post&backfill_date_limit=unlimited' )
			->assertOk()
			->json();

		$this->assertContains( $old->ID, $ids );
	}

	/**
	 * An explicit day-count `backfill_date_limit` param excludes posts published outside
	 * that window.
	 *
	 * `per_page` is pinned to the number of recent posts; see the docblock on
	 * test_omitted_param_limits_results_to_the_default_window() for why.
	 */
	public function test_explicit_day_count_param_excludes_older_posts(): void {
		$this->acting_as( 'administrator' );

		$recent = $this->create_post_days_ago( 'Recent Post', 2 );
		$old    = $this->create_post_days_ago( 'Old Post', 10 );

		$ids = $this->get_json( '/wp-json/wp-curate/v1/posts/?post_type=post&backfill_date_limit=5&per_page=1' )
			->assertOk()
			->json();

		$this->assertContains( $recent->ID, $ids );
		$this->assertNotContains( $old->ID, $ids );
	}

	/**
	 * When the date-limited query doesn't return the full expected number of posts, the
	 * endpoint falls back to an unconstrained query — matching the frontend render path's
	 * behavior (see tests/Feature/BackfillDateLimitTest.php) so the editor preview stays in
	 * parity with what actually renders.
	 */
	public function test_falls_back_to_unlimited_when_not_enough_recent_posts(): void {
		$this->acting_as( 'administrator' );

		$recent = $this->create_post_days_ago( 'Recent Post', 2 );
		$old    = $this->create_post_days_ago( 'Old Post', 60 );

		$ids = $this->get_json( '/wp-json/wp-curate/v1/posts/?post_type=post&backfill_date_limit=5&per_page=2' )
			->assertOk()
			->json();

		$this->assertContains( $recent->ID, $ids );
		$this->assertContains( $old->ID, $ids );
	}
}
