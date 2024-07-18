<?php
/**
 * WP Curate Tests: Unique Pinned Post Test
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Tests\Feature;

use Alley\WP\WP_Curate\Tests\Test_Case;

/**
 * A test suite for unique pinned posts.
 *
 * @link https://mantle.alley.com/testing/test-framework.html
 */
class Unique_Pinned_Post_Test extends Test_Case {
	/**
	 * Run before each test.
	 */
	protected function setUp(): void {
		parent::setUp();

		$this->set_permalink_structure( '/%postname%/' );

		static::factory()->post->create([
			'post_title' => 'TheWrapTestPost 1',
		]);
		static::factory()->post->create([
			'post_title' => 'TheWrapTestPost 2',
		]);
		static::factory()->post->create([
			'post_title' => 'TheWrapTestPost 3',
		]);
		static::factory()->post->create([
			'post_title' => 'TheWrapTestPost 4',
		]);
		static::factory()->post->create([
			'post_title' => 'TheWrapTestPost 5',
		]);
		static::factory()->post->create([
			'post_title' => 'TheWrapTestPost 6',
		]);
	}

	/**
	 *  If configured, pinned posts should only display once regardless of where on the page
	 *  the post was pinned at.
	 */
	public function test_pinned_post_only_displays_once() {
		$pinned_post = static::factory()->post->as_models()->create_and_get([
			'post_title' => 'PinnedPost 1',
		]);
		$pinned_post_id = $pinned_post->id();

		$content = <<<HTML
				<!-- wp:wp-curate/query {"numberOfPosts":2,"postTypes":["post"],"posts":[null,null]} -->
				<div class="wp-block-wp-curate-query"><!-- wp:post-template -->
				<!-- wp:wp-curate/post -->
				<div class="wp-block-wp-curate-post"><!-- wp:post-title {"isLink":true} /--></div>
				<!-- /wp:wp-curate/post -->
				<!-- /wp:post-template --></div>
				<!-- /wp:wp-curate/query -->

				<!-- wp:wp-curate/query {"numberOfPosts":2,"postTypes":["post"],"posts":[null,null]} -->
				<div class="wp-block-wp-curate-query"><!-- wp:post-template -->
				<!-- wp:wp-curate/post -->
				<div class="wp-block-wp-curate-post"><!-- wp:post-title {"isLink":true} /--></div>
				<!-- /wp:wp-curate/post -->
				<!-- /wp:post-template --></div>
				<!-- /wp:wp-curate/query -->

				<!-- wp:wp-curate/query {"numberOfPosts":1,"postTypes":["post"],"posts":[$pinned_post_id]} -->
				<div class="wp-block-wp-curate-query"><!-- wp:post-template -->
				<!-- wp:wp-curate/post -->
				<div class="wp-block-wp-curate-post"><!-- wp:post-title {"isLink":true} /--></div>
				<!-- /wp:wp-curate/post -->
				<!-- /wp:post-template --></div>
				<!-- /wp:wp-curate/query -->
				HTML;

		$post = static::factory()
			->post
			->with_meta(
				[
					'wp_curate_deduplication'       => '1',
					'wp_curate_unique_pinned_posts' => '1'
				]
			)
			->as_models()
			->create_and_get(
				[
					'post_content' => print_r($content, true ),
				]);

		$page = $this->get( $post )->assertOk();
		dump($page->get_content());

		$occurrences = substr_count( $page->get_content(), 'PinnedPost 1' );
		$this->assertEquals( 1, $occurrences );
	}
}
