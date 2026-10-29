<?php
/**
 * WP Curate Tests: Deduplication Test
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Tests\Feature;

use Alley\WP\WP_Curate\Tests\TestCase;
use Mantle\Testing\Utils;

use function Mantle\Testing\block_factory;

/**
 * Test the deduplication functionality of the plugin.
 */
class DeduplicationTest extends TestCase {
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
		remove_all_filters( 'wp_curate_deduplication_enabled' );

		parent::tearDown();
	}

	/**
	 * Test that deduplication works across two query blocks on the same page.
	 */
	public function test_it_can_deduplicate_across_two_query_blocks(): void {
		$posts = static::create_ordered_set( 10 )->reverse()->values();

		$this->set_front_page( $page = static::factory()->page->with_meta( 'wp_curate_deduplication', '1' )->create_and_get( [
			'post_content' => block_factory()->blocks(
				block_factory()->preset( 'wp-curate/query', [
					'attributes' => [
						'numberOfPosts' => 5,
					],
				] ),
				block_factory()->preset( 'wp-curate/query', [
					'attributes' => [
						'numberOfPosts' => 5,
					],
				] ),
			),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueryTrue( 'is_front_page', 'is_page', 'is_singular' )
			->assertQueriedObjectId( $page->ID )
			// Ensure all posts appear in the proper order without duplicates.
			->assertSeeInOrder( $posts->pluck( 'post_title' )->all() );
	}

	/**
	 * Test that a individual query block can disable deduplication on a per-block basis.
	 */
	public function test_it_can_override_deduplication_per_block(): void {
		$posts = static::create_ordered_set( 10 )->reverse()->values();

		$this->set_front_page( $page = static::factory()->page->with_meta( 'wp_curate_deduplication', '1' )->create_and_get( [
			'post_content' => block_factory()->blocks(
				block_factory()->preset( 'wp-curate/query', [
					'attributes' => [
						'numberOfPosts' => 5,
					],
				] ),
				block_factory()->preset( 'wp-curate/query', [
					'attributes' => [
						'deduplication' => 'never',
						'numberOfPosts' => 5,
					],
				] ),
			),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueryTrue( 'is_front_page', 'is_page', 'is_singular' )
			->assertQueriedObjectId( $page->ID )
			// Ensure all posts appear in the proper order without duplicates.
			->assertSeeInOrder( [
				...$posts->slice( 0, 5 )->pluck( 'post_title' )->all(),
				...$posts->slice( 0, 5 )->pluck( 'post_title' )->all(),
			] )
			// Ensure posts 6 through 10 do not appear (only first 5 should appear).
			->assertDontSee( $posts->get( 5 )->post_title );
	}

	/**
	 * Test that the filter can enable deduplication when the page does not.
	 */
	public function test_filter_can_enable_deduplication(): void {
		$posts = static::create_ordered_set( 10 )->reverse()->values();

		add_filter( 'wp_curate_deduplication_enabled', '__return_true' );

		$this->set_front_page( $page = static::factory()->page->create_and_get( [
			'post_content' => block_factory()->blocks(
				block_factory()->preset( 'wp-curate/query', [
					'attributes' => [
						'numberOfPosts' => 5,
					],
				] ),
				block_factory()->preset( 'wp-curate/query', [
					'attributes' => [
						'numberOfPosts' => 5,
					],
				] ),
			),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueriedObjectId( $page->ID )
			// Ensure all posts appear in the proper order without duplicates.
			->assertSeeInOrder( $posts->pluck( 'post_title' )->all() );
	}

	/**
	 * Test that the filter can disable deduplication when the page enables it.
	 */
	public function test_filter_can_disable_deduplication(): void {
		$posts = static::create_ordered_set( 10 )->reverse()->values();

		add_filter( 'wp_curate_deduplication_enabled', '__return_false' );

		$this->set_front_page( $page = static::factory()->page->with_meta( 'wp_curate_deduplication', '1' )->create_and_get( [
			'post_content' => block_factory()->blocks(
				block_factory()->preset( 'wp-curate/query', [
					'attributes' => [
						'numberOfPosts' => 5,
					],
				] ),
				block_factory()->preset( 'wp-curate/query', [
					'attributes' => [
						'numberOfPosts' => 5,
					],
				] ),
			),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueriedObjectId( $page->ID )
			// Ensure both blocks show the same first five posts.
			->assertSeeInOrder( [
				...$posts->slice( 0, 5 )->pluck( 'post_title' )->all(),
				...$posts->slice( 0, 5 )->pluck( 'post_title' )->all(),
			] )
			// Ensure posts 6 through 10 do not appear.
			->assertDontSee( $posts->get( 5 )->post_title );
	}

	/**
	 * Test that the filter can override the per-block "never" attribute.
	 */
	public function test_filter_can_override_never_attribute(): void {
		$posts = static::create_ordered_set( 10 )->reverse()->values();

		add_filter( 'wp_curate_deduplication_enabled', '__return_true' );

		$this->set_front_page( $page = static::factory()->page->with_meta( 'wp_curate_deduplication', '1' )->create_and_get( [
			'post_content' => block_factory()->blocks(
				block_factory()->preset( 'wp-curate/query', [
					'attributes' => [
						'numberOfPosts' => 5,
					],
				] ),
				block_factory()->preset( 'wp-curate/query', [
					'attributes' => [
						'deduplication' => 'never',
						'numberOfPosts' => 5,
					],
				] ),
			),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueriedObjectId( $page->ID )
			// Ensure the "never" block still skips posts used by the first block.
			->assertSeeInOrder( $posts->pluck( 'post_title' )->all() );
	}
}
