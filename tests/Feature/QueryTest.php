<?php
/**
 * WP Curate Tests: Query Test
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
 * Test the queries that fill the query block.
 */
class QueryTest extends TestCase {
	public function test_query_posts_by_taxonomies(): void {
		$categorized_posts = collect( static::factory()->post
			->with_terms( $category = static::factory()->category->create_and_get() )
			->create_ordered_set( 8 ) )
			->map( fn ( int $id ): WP_Post => get_post( $id ) );

		$other_posts = collect( static::factory()->post->create_ordered_set( 8 ) )
			->map( fn ( int $id ): WP_Post => get_post( $id ) );

		$this->set_front_page( $page = static::factory()->page->create_and_get( [
			'post_content' => block_factory()->preset( 'wp-curate/query', [
				'attributes' => [
					'numberOfPosts' => 10,
					'terms' => [
						'category' => [
							[
								'id' => $category->term_id,
								'title' => $category->name,
							],
						],
					],
				],
			] ),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueryTrue( 'is_front_page', 'is_page', 'is_singular' )
			->assertQueriedObjectId( $page->ID )
			// Ensure all posts appear in the proper order.
			->assertSeeInOrder( $categorized_posts->reverse()->values()->pluck( 'post_title' )->all() )
			// Ensure other posts do not appear.
			->assertDontSee( $other_posts->get( 0 )->post_title )
			->assertDontSee( $other_posts->get( 1 )->post_title )
			->assertDontSee( $other_posts->get( 2 )->post_title );
	}

	public function test_query_posts_by_taxonomies_or_operator(): void {
		$category_1_posts = collect( static::factory()->post
			->with_terms( $category_1 = static::factory()->category->create_and_get() )
			->create_ordered_set( 5, starting_date: now()->subDays( 10 ) ) )
			->map( fn ( int $id ): WP_Post => get_post( $id ) );

		$category_2_posts = collect( static::factory()->post
			->with_terms( $category_2 = static::factory()->category->create_and_get() )
			->create_ordered_set( 5 ) )
			->map( fn ( int $id ): WP_Post => get_post( $id ) );

		$this->set_front_page( $page = static::factory()->page->create_and_get( [
			'post_content' => block_factory()->preset( 'wp-curate/query', [
				'attributes' => [
					'numberOfPosts' => 10,
					'termRelations' => [
						'category' => 'OR',
					],
					'terms' => [
						'category' => [
							[
								'id' => $category_1->term_id,
								'title' => $category_1->name,
							],
							[
								'id' => $category_2->term_id,
								'title' => $category_2->name,
							],
						],
					],
				],
			] ),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueryTrue( 'is_front_page', 'is_page', 'is_singular' )
			->assertQueriedObjectId( $page->ID )
			// Ensure all posts appear in the proper order across both categories.
			->assertSeeInOrder( [
				...$category_2_posts->reverse()->values()->pluck( 'post_title' )->all(),
				...$category_1_posts->reverse()->values()->pluck( 'post_title' )->all(),
			] );
	}

	public function test_query_posts_with_a_search_term(): void {
		$posts = collect( static::factory()->post
			->create_ordered_set( 5, args: [ 'post_title' => 'Example' ] ) )
			->map( fn ( int $id ): WP_Post => get_post( $id ) );

		$other_posts = collect( static::factory()->post
			->create_ordered_set( 5, args: [ 'post_title' => 'Other' ] ) )
			->map( fn ( int $id ): WP_Post => get_post( $id ) );

		$this->set_front_page( $page = static::factory()->page->create_and_get( [
			'post_content' => block_factory()->preset( 'wp-curate/query', [
				'attributes' => [
					'numberOfPosts' => 10,
					'searchTerm'   => 'Example',
				],
			] ),
		] ) );

		$this->get( '/' )
			->assertOk()
			->assertQueryTrue( 'is_front_page', 'is_page', 'is_singular' )
			->assertQueriedObjectId( $page->ID )
			// Ensure all posts appear in the proper order across both categories.
			->assertSeeInOrder( $posts->reverse()->values()->pluck( 'post_title' )->all() )
			// Ensure other posts do not appear.
			->assertDontSee( $other_posts->get( 0 )->post_title );
	}

	public function test_query_posts_in_ascending_order(): void {
		$this->markTestIncomplete( 'This test needs to be implemented.' );
	}

	public function test_query_posts_order_by_title(): void {
		$this->markTestIncomplete( 'This test needs to be implemented.' );
	}

	public function test_query_posts_in_custom_post_type(): void {
		$this->markTestIncomplete( 'This test needs to be implemented.' );
	}
}
