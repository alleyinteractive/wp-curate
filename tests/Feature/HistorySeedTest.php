<?php
/**
 * WP Curate Tests: History Seed Test
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Tests\Feature;

use Alley\WP\Post_IDs\Post_IDs_Envelope;
use Alley\WP\WP_Curate\Tests\TestCase;
use Mantle\Testing\Utils;

use function Mantle\Testing\block_factory;

/**
 * Test the `wp_curate_history_seed` filter.
 */
class HistorySeedTest extends TestCase {
	/**
	 * Run before each test.
	 */
	protected function setUp(): void {
		parent::setUp();

		Utils::delete_all_data();
	}

	/**
	 * Run after each test.
	 */
	protected function tearDown(): void {
		remove_all_filters( 'wp_curate_history_seed' );

		parent::tearDown();
	}

	/**
	 * Test that post IDs from a filtered seed are excluded from query blocks.
	 */
	public function test_it_excludes_post_ids_from_a_filtered_seed(): void {
		$posts = static::create_ordered_set( 10 )->reverse()->values();

		add_filter(
			'wp_curate_history_seed',
			fn () => new Post_IDs_Envelope( [ $posts->get( 0 )->ID ] ),
		);

		$this->set_front_page( $page = static::factory()->page->with_meta( 'wp_curate_deduplication', '1' )->create_and_get( [
			'post_content' => block_factory()->preset( 'wp-curate/query', [
				'attributes' => [
					'numberOfPosts' => 5,
				],
			] ),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueriedObjectId( $page->ID )
			// The seeded post is skipped, so the next five posts appear.
			->assertSeeInOrder( $posts->slice( 1, 5 )->pluck( 'post_title' )->all() )
			->assertDontSee( $posts->get( 0 )->post_title );
	}

	/**
	 * Test that the filter runs once per request, however many blocks render.
	 */
	public function test_it_applies_the_filter_once_per_request(): void {
		$calls = 0;

		static::create_ordered_set( 10 );

		add_filter(
			'wp_curate_history_seed',
			function ( $seed ) use ( &$calls ) {
				++$calls;

				return $seed;
			},
		);

		$this->set_front_page( static::factory()->page->with_meta( 'wp_curate_deduplication', '1' )->create_and_get( [
			'post_content' => block_factory()->blocks(
				block_factory()->preset( 'wp-curate/query', [
					'attributes' => [
						'numberOfPosts' => 3,
					],
				] ),
				block_factory()->preset( 'wp-curate/query', [
					'attributes' => [
						'numberOfPosts' => 3,
					],
				] ),
			),
		] ) );

		$this->get( '/' )->assertOk();

		$this->assertSame( 1, $calls );
	}

	/**
	 * Test that a filtered seed that is not a Post_IDs object is replaced with the default.
	 */
	public function test_it_falls_back_to_the_default_seed_for_an_invalid_value(): void {
		$posts = static::create_ordered_set( 10 )->reverse()->values();

		$this->setExpectedIncorrectUsage( 'wp_curate_history_seed' );

		add_filter( 'wp_curate_history_seed', fn () => 'not a Post_IDs object' );

		$this->set_front_page( $page = static::factory()->page->with_meta( 'wp_curate_deduplication', '1' )->create_and_get( [
			'post_content' => block_factory()->preset( 'wp-curate/query', [
				'attributes' => [
					'numberOfPosts' => 5,
				],
			] ),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueriedObjectId( $page->ID )
			->assertSeeInOrder( $posts->slice( 0, 5 )->pluck( 'post_title' )->all() );
	}
}
