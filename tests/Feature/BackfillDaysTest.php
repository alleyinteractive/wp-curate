<?php
/**
 * WP Curate Tests: Backfill Days Test
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Tests\Feature;

use Alley\WP\WP_Curate\Tests\TestCase;
use WP_Post;

use function Mantle\Support\Helpers\collect;
use function Mantle\Support\Helpers\now;
use function Mantle\Testing\block_factory;

/**
 * Test the backfill date limit functionality in Plugin_Curated_Posts.
 */
class BackfillDaysTest extends TestCase {
	/**
	 * Test that posts older than the backfill day limit are excluded.
	 */
	public function test_backfill_days_excludes_old_posts(): void {
		$recent_posts = collect( static::factory()->post->create_ordered_set( 3 ) )
			->map( fn ( int $id ): WP_Post => get_post( $id ) );

		$old_posts = collect( static::factory()->post->create_ordered_set( 3, starting_date: now()->subDays( 60 ) ) )
			->map( fn ( int $id ): WP_Post => get_post( $id ) );

		$this->set_front_page( $page = static::factory()->page->create_and_get( [
			'post_content' => block_factory()->preset( 'wp-curate/query', [
				'attributes' => [
					'numberOfPosts' => 6,
					'backfillDays'  => 30,
				],
			] ),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueriedObjectId( $page->ID )
			->assertSeeInOrder( $recent_posts->reverse()->values()->pluck( 'post_title' )->all() )
			->assertDontSee( $old_posts->get( 0 )->post_title )
			->assertDontSee( $old_posts->get( 1 )->post_title )
			->assertDontSee( $old_posts->get( 2 )->post_title );
	}

	/**
	 * Test that setting backfillDays to 0 disables the date limit.
	 */
	public function test_zero_backfill_days_shows_all_posts(): void {
		$old_posts = collect( static::factory()->post->create_ordered_set( 3, starting_date: now()->subDays( 365 ) ) )
			->map( fn ( int $id ): WP_Post => get_post( $id ) );

		$this->set_front_page( $page = static::factory()->page->create_and_get( [
			'post_content' => block_factory()->preset( 'wp-curate/query', [
				'attributes' => [
					'numberOfPosts' => 3,
					'backfillDays'  => 0,
				],
			] ),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueriedObjectId( $page->ID )
			->assertSeeInOrder( $old_posts->reverse()->values()->pluck( 'post_title' )->all() );
	}

	/**
	 * Test that the wp_curate_backfill_days filter overrides the per-block attribute.
	 *
	 * The block is set to 30 days, but a filter widens the window to 90 days.
	 * Posts from 60 days ago should appear because the filter wins.
	 */
	public function test_backfill_days_filter_overrides_block_attribute(): void {
		$mid_range_posts = collect( static::factory()->post->create_ordered_set( 3, starting_date: now()->subDays( 60 ) ) )
			->map( fn ( int $id ): WP_Post => get_post( $id ) );

		$filter = fn () => 90;
		add_filter( 'wp_curate_backfill_days', $filter );

		$this->set_front_page( $page = static::factory()->page->create_and_get( [
			'post_content' => block_factory()->preset( 'wp-curate/query', [
				'attributes' => [
					'numberOfPosts' => 3,
					'backfillDays'  => 30,
				],
			] ),
		] ) );

		$response = $this->get( '/' )
			->assertOk()
			->assertQueriedObjectId( $page->ID )
			->assertSeeInOrder( $mid_range_posts->reverse()->values()->pluck( 'post_title' )->all() );

		remove_filter( 'wp_curate_backfill_days', $filter );
	}
}
