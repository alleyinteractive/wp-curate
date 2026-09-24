<?php
/**
 * WP Curate Tests: Search By URL Test
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Tests\Feature;

use Alley\WP\WP_Curate\Tests\TestCase;

/**
 * Test that the post search endpoint used by the "Select post" picker can
 * resolve a pasted post URL to that post.
 */
class SearchByUrlTest extends TestCase {
	/**
	 * Test that searching by a post's permalink returns that post.
	 */
	public function test_it_can_search_by_post_url(): void {
		$post = static::factory()->post->create_and_get( [
			'post_title' => 'A Very Specific Title',
		] );

		static::factory()->post->create_ordered_set( 3 );

		$this->get_json( '/wp-json/wp/v2/search?' . http_build_query( [ 'search' => get_permalink( $post ) ] ) )
			->assertOk()
			->assertJsonCount( 1 )
			->assertJsonPath( '0.id', $post->ID );
	}

	/**
	 * Test that a URL that doesn't resolve to a post falls back to a normal (empty) search.
	 */
	public function test_unresolvable_url_returns_no_results(): void {
		static::factory()->post->create_ordered_set( 3 );

		$this->get_json( '/wp-json/wp/v2/search?' . http_build_query( [ 'search' => 'https://example.com/not-a-real-post/' ] ) )
			->assertOk()
			->assertJsonCount( 0 );
	}

	/**
	 * Test that a URL resolving to a draft post does not leak that post through search.
	 */
	public function test_draft_post_url_returns_no_results(): void {
		$post = static::factory()->post->create_and_get( [
			'post_title'  => 'A Very Specific Title',
			'post_status' => 'draft',
		] );

		static::factory()->post->create_ordered_set( 3 );

		$this->get_json( '/wp-json/wp/v2/search?' . http_build_query( [ 'search' => get_permalink( $post ) ] ) )
			->assertOk()
			->assertJsonCount( 0 );
	}

	/**
	 * Test that a scheduled post's permalink does not leak that post through
	 * search, even for a logged-in user requesting future posts. URL-based
	 * search always forces `post_status` back to `publish`, regardless of
	 * whether `add_future_support()` has already widened it.
	 *
	 * @see \Alley\WP\WP_Curate\Features\Rest_Api::add_url_search_support()
	 */
	public function test_scheduled_post_url_returns_no_results(): void {
		$this->acting_as( 'administrator' );

		$post = static::factory()->post->create_and_get( [
			'post_title'  => 'A Very Specific Title',
			'post_status' => 'future',
			'post_date'   => gmdate( 'Y-m-d H:i:s', strtotime( '+1 day' ) ),
		] );

		static::factory()->post->create_ordered_set( 3 );

		$this->get_json(
			'/wp-json/wp/v2/search?' . http_build_query(
				[
					'search'                   => get_permalink( $post ),
					'wp_curate_include_future' => '1',
				]
			)
		)
			->assertOk()
			->assertJsonCount( 0 );
	}

	/**
	 * Test that a plain text search still works as before.
	 */
	public function test_text_search_still_works(): void {
		$post = static::factory()->post->create_and_get( [
			'post_title' => 'A Very Specific Title',
		] );

		static::factory()->post->create_ordered_set( 3 );

		$this->get_json( '/wp-json/wp/v2/search?' . http_build_query( [ 'search' => 'Very Specific' ] ) )
			->assertOk()
			->assertJsonCount( 1 )
			->assertJsonPath( '0.id', $post->ID );
	}
}
