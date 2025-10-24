<?php
/**
 * WP Curate Tests: Block Test
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Tests\Feature;

use Alley\WP\WP_Curate\Tests\TestCase;

use function Mantle\Support\Helpers\collect;
use function Mantle\Testing\block_factory;

/**
 * Test the general block functionality of WP Curate.
 */
class BlockTest extends TestCase {
	public function test_curate_a_homepage(): void {
		$posts = static::factory()->post->create_ordered_set( 10 );

		$posts = collect( $posts )
			->map( fn ( int $post_id ) => get_post( $post_id ) )
			->reverse()
			->values();

		$this->set_front_page( $page = static::factory()->page->create_and_get( [
			'post_content' => block_factory()->preset( 'wp-curate/query', [
				'attributes' => [
					'numberOfPosts' => 8,
				],
			] ),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueryTrue( 'is_front_page', 'is_page', 'is_singular' )
			->assertQueriedObjectId( $page->ID )
			// Ensure all posts appear in the proper order.
			->assertSeeInOrder( $posts->slice( 0, 8 )->pluck( 'post_title' )->all() )
			// Ensure posts 9 and 10 do not appear (only 8 should appear).
			->assertDontSee( $posts->get( 8 )->post_title )
			->assertDontSee( $posts->get( 9 )->post_title )
			// Ensure excerpts are shown.
			->assertQuerySelectorExists( '.wp-block-post-excerpt__excerpt' );
	}

	public function test_curate_a_page_with_offset(): void {
		$posts = static::factory()->post->create_ordered_set( 10 );

		$posts = collect( $posts )
			->map( fn ( int $post_id ) => get_post( $post_id ) )
			->reverse()
			->values();

		$this->set_front_page( $page = static::factory()->page->create_and_get( [
			'post_content' => block_factory()->preset( 'wp-curate/query', [
				'attributes' => [
					'offset'        => 2,
					'numberOfPosts' => 8,
				],
			] ),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueryTrue( 'is_front_page', 'is_page', 'is_singular' )
			->assertQueriedObjectId( $page->ID )
			// Ensure all posts appear in the proper order.
			->assertSeeInOrder( $posts->slice( 2, 10 )->pluck( 'post_title' )->all() )
			// Ensure posts 1 and 2 do not appear (they are offset).
			->assertDontSee( $posts->get( 0 )->post_title )
			->assertDontSee( $posts->get( 1 )->post_title )
			// Ensure excerpts are shown.
			->assertQuerySelectorExists( '.wp-block-post-excerpt__excerpt' );
	}
}
