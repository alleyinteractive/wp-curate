<?php
/**
 * WP Curate Tests: Pinned Post Test
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Tests\Feature;

use Alley\WP\WP_Curate\Tests\TestCase;

use function Mantle\Support\Helpers\collect;
use function Mantle\Testing\block_factory;

/**
 * Test the pinned post functionality of the plugin.
 */
class PinnedPostTest extends TestCase {
	/**
	 * Test that pinned posts appear at the top of a query.
	 */
	public function test_it_can_pin_a_post_at_the_top_of_a_query(): void {
		$posts = static::create_ordered_set( 5 );

		$pinned_posts = collect( [ $posts->pull( 2 ), $posts->pull( 4 ) ] );

		$this->set_front_page( $page = static::factory()->page->create_and_get( [
			'post_content' => block_factory()->preset( 'wp-curate/query', [
				'attributes' => [
					'numberOfPosts' => 8,
					'posts'         => $pinned_posts->pluck( 'ID' )->all(),
				],
			] ),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueryTrue( 'is_front_page', 'is_page', 'is_singular' )
			->assertQueriedObjectId( $page->ID )
			->assertSeeInOrder( [
				// Ensure the pinned posts are at the top.
				$pinned_posts[0]->post_title,
				$pinned_posts[1]->post_title,
				// Followed by the rest of the posts in reverse order.
				...$posts->reverse()->values()->pluck( 'post_title' )->all(),
			] );
	}

	/**
	 * Test that pinned posts can be placed at specific positions in a query.
	 */
	public function test_it_can_pin_at_specific_positions(): void {
		$posts = static::create_ordered_set( 6 );

		// Pin the posts at positions 1 and 3 (0-based).
		$pinned_posts = collect( [
			null,
			$posts->pull( 1 )->ID,
			null,
			$posts->pull( 3 )->ID,
		] );

		$this->set_front_page( $page = static::factory()->page->create_and_get( [
			'post_content' => block_factory()->preset( 'wp-curate/query', [
				'attributes' => [
					'numberOfPosts' => 8,
					'posts'         => $pinned_posts->all(),
				],
			] ),
		] ) );

		// Build the expected order of posts with pinned posts in place (#1 and #3).
		$expected_order = $posts->reverse()->values();
		$expected_order->splice( 1, 0, [ get_post( $pinned_posts[1] ) ] );
		$expected_order->splice( 3, 0, [ get_post( $pinned_posts[3] ) ] );

		$this->get( '/' )
			->assertOk()
			->assertQueryTrue( 'is_front_page', 'is_page', 'is_singular' )
			->assertQueriedObjectId( $page->ID )
			->assertSeeInOrder( $expected_order->pluck( 'post_title' )->all() );
	}

	/**
	 * Test that a scheduled post can be pinned before it is published but won't
	 * appear on the front end until published.
	 */
	public function test_it_can_pin_a_scheduled_post_but_will_not_display_it(): void {
		$posts = static::create_ordered_set( 5 );

		$scheduled_post = static::factory()->post->create_and_get( [
			'post_title'  => 'Scheduled Post',
			'post_status' => 'future',
			'post_date'   => gmdate( 'Y-m-d H:i:s', time() + DAY_IN_SECONDS ),
		] );

		$this->get( $scheduled_post )->assertNotFound();

		$this->set_front_page( $page = static::factory()->page->create_and_get( [
			'post_content' => block_factory()->preset( 'wp-curate/query', [
				'attributes' => [
					'numberOfPosts' => 8,
					'posts'         => [ $scheduled_post->ID ],
				],
			] ),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueryTrue( 'is_front_page', 'is_page', 'is_singular' )
			->assertQueriedObjectId( $page->ID )
			->assertDontSeeText( $scheduled_post->post_title )
			->assertSeeInOrder( $posts->reverse()->values()->pluck( 'post_title' )->all() );
	}

	public function test_it_will_not_display_a_draft_pinned_post(): void {
		$posts = static::create_ordered_set( 5 );

		$draft_post = static::factory()->post->create_and_get( [
			'post_title'  => 'Draft Post',
			'post_status' => 'draft',
		] );

		$this->set_front_page( $page = static::factory()->page->create_and_get( [
			'post_content' => block_factory()->preset( 'wp-curate/query', [
				'attributes' => [
					'numberOfPosts' => 8,
					'posts'         => [ $draft_post->ID ],
				],
			] ),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueryTrue( 'is_front_page', 'is_page', 'is_singular' )
			->assertQueriedObjectId( $page->ID )
			->assertDontSeeText( $draft_post->post_title )
			->assertSeeInOrder( $posts->reverse()->values()->pluck( 'post_title' )->all() );
	}
}
