<?php
/**
 * WP Curate Tests: Backfill Date Limit Test
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Tests\Feature;

use Alley\WP\WP_Curate\Tests\TestCase;

use function Mantle\Testing\block_factory;

/**
 * Test that backfill (dynamically-filled) query and subquery block slots are limited to
 * recently published posts, with a per-block override that always wins over the sitewide
 * `wp_curate_backfill_date_limit` filter default.
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
	 * With the block left at its default backfill date limit, posts published outside the
	 * default 30-day window are not selected -- even when ordering ascending would otherwise
	 * surface them first.
	 */
	public function test_default_backfill_date_limit_excludes_older_posts(): void {
		$old    = $this->create_post_days_ago( 'Sixty Days Old', 60 );
		$middle = $this->create_post_days_ago( 'Twenty Five Days Old', 25 );
		$recent = $this->create_post_days_ago( 'Ten Days Old', 10 );

		$this->set_front_page( $page = static::factory()->page->create_and_get( [
			'post_content' => block_factory()->preset( 'wp-curate/query', [
				'attributes' => [
					'numberOfPosts' => 2,
					'order'         => 'asc',
				],
			] ),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueriedObjectId( $page->ID )
			->assertSeeInOrder( [ $middle->post_title, $recent->post_title ] )
			->assertDontSeeText( $old->post_title );
	}

	/**
	 * Manually pinned posts always render regardless of their publish date, even when far
	 * outside any backfill date limit.
	 */
	public function test_pinned_posts_are_never_date_limited(): void {
		$pinned = $this->create_post_days_ago( 'Pinned Ancient Post', 100 );
		$recent = $this->create_post_days_ago( 'Recent Backfill Post', 5 );

		$this->set_front_page( $page = static::factory()->page->create_and_get( [
			'post_content' => block_factory()->preset( 'wp-curate/query', [
				'attributes' => [
					'numberOfPosts' => 2,
					'posts'         => [ $pinned->ID ],
				],
			] ),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueriedObjectId( $page->ID )
			->assertSeeInOrder( [ $pinned->post_title, $recent->post_title ] );
	}

	/**
	 * When there aren't enough recently published posts to fill every backfill slot, the
	 * query falls back to being unconstrained by date rather than leaving slots empty.
	 */
	public function test_backfill_falls_back_to_unlimited_when_not_enough_recent_posts(): void {
		$recent = $this->create_post_days_ago( 'Ten Days Old', 10 );
		$older  = $this->create_post_days_ago( 'Sixty Days Old', 60 );
		$oldest = $this->create_post_days_ago( 'Ninety Days Old', 90 );

		$this->set_front_page( $page = static::factory()->page->create_and_get( [
			'post_content' => block_factory()->preset( 'wp-curate/query', [
				'attributes' => [
					'numberOfPosts' => 3,
				],
			] ),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueriedObjectId( $page->ID )
			->assertSeeText( $recent->post_title )
			->assertSeeText( $older->post_title )
			->assertSeeText( $oldest->post_title );
	}

	/**
	 * An explicit per-block "Backfill Date Limit" choice always wins over the sitewide
	 * `wp_curate_backfill_date_limit` filter default.
	 */
	public function test_explicit_block_override_beats_sitewide_filter_default(): void {
		add_filter( 'wp_curate_backfill_date_limit', fn () => 5 );

		$too_old = $this->create_post_days_ago( 'Four Hundred Days Old', 400 );
		$within  = $this->create_post_days_ago( 'Two Hundred Days Old', 200 );
		$recent  = $this->create_post_days_ago( 'Two Days Old', 2 );

		$this->set_front_page( $page = static::factory()->page->create_and_get( [
			'post_content' => block_factory()->preset( 'wp-curate/query', [
				'attributes' => [
					'numberOfPosts'     => 2,
					'order'             => 'asc',
					'backfillDateLimit' => '365',
				],
			] ),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueriedObjectId( $page->ID )
			->assertSeeInOrder( [ $within->post_title, $recent->post_title ] )
			->assertDontSeeText( $too_old->post_title );
	}

	/**
	 * The sitewide `wp_curate_backfill_date_limit` filter supplies the default window when a
	 * block's "Backfill Date Limit" control has not been explicitly set.
	 */
	public function test_sitewide_filter_applies_when_attribute_is_unset(): void {
		add_filter( 'wp_curate_backfill_date_limit', fn () => 5 );

		$outside_filter = $this->create_post_days_ago( 'Ten Days Old', 10 );
		$within_filter  = $this->create_post_days_ago( 'Two Days Old', 2 );

		$this->set_front_page( $page = static::factory()->page->create_and_get( [
			'post_content' => block_factory()->preset( 'wp-curate/query', [
				'attributes' => [
					'numberOfPosts' => 1,
					'order'         => 'asc',
				],
			] ),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueriedObjectId( $page->ID )
			->assertSeeText( $within_filter->post_title )
			->assertDontSeeText( $outside_filter->post_title );
	}

	/**
	 * An explicit "unlimited" per-block choice disables date-limiting entirely.
	 */
	public function test_explicit_unlimited_attribute_disables_date_limiting(): void {
		$ancient = $this->create_post_days_ago( 'Four Hundred Days Old', 400 );
		$recent  = $this->create_post_days_ago( 'Five Days Old', 5 );

		$this->set_front_page( $page = static::factory()->page->create_and_get( [
			'post_content' => block_factory()->preset( 'wp-curate/query', [
				'attributes' => [
					'numberOfPosts'     => 1,
					'order'             => 'asc',
					'backfillDateLimit' => 'unlimited',
				],
			] ),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueriedObjectId( $page->ID )
			->assertSeeText( $ancient->post_title )
			->assertDontSeeText( $recent->post_title );
	}
}
