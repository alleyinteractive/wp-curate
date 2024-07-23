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
class UniquePinnedPostTest extends Test_Case {
	/**
	 * Run before each test.
	 */
	protected function setUp(): void {
		parent::setUp();

		$this->set_permalink_structure( '/%postname%/' );

		static::factory()->post->create(
			[
				'post_title' => 'Test Post 1',
			]
		);
		static::factory()->post->create(
			[
				'post_title' => 'Test Post 2',
			]
		);
		static::factory()->post->create(
			[
				'post_title' => 'Test Post 3',
			]
		);
		static::factory()->post->create(
			[
				'post_title' => 'Test Post 4',
			]
		);
		static::factory()->post->create(
			[
				'post_title' => 'Test Post 5',
			]
		);
		static::factory()->post->create(
			[
				'post_title' => 'Test Post 6',
			]
		);
	}

	/**
	 * Create the HTML content for the test.
	 *
	 * @param int $pinned_post_id The pinned post id.
	 * @return string
	 */
	private function create_html_content( int $pinned_post_id ): string {
		return <<<HTML
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
	}

	/**
	 * Do not enforce unique pinned posts if it is not enabled.
	 */
	public function test_do_not_enforce_unique_pinned_posts_if_not_enabled() {
		$pinned_post    = static::factory()->post->as_models()->create_and_get(
			[
				'post_title' => 'Pinned Post 1',
			]
		);
		$pinned_post_id = $pinned_post->id();

		$content = $this->create_html_content( $pinned_post_id );

		$test_post = static::factory()
			->post
			->with_meta(
				[
					'wp_curate_deduplication'       => '1',
					'wp_curate_unique_pinned_posts' => '0',
				]
			)
			->create_and_get( [ 'post_content' => $content ] );

		$page = $this->get( $test_post )->assertOk();

		$this->assertEquals( 2, substr_count( $page->get_content(), 'Pinned Post 1' ) );
	}

	/**
	 *  If configured, pinned posts should only display once regardless of where on the page
	 *  the post was pinned at.
	 */
	public function test_pinned_post_only_displays_once() {
		$pinned_post    = static::factory()->post->as_models()->create_and_get(
			[
				'post_title' => 'Pinned Post 2',
			]
		);
		$pinned_post_id = $pinned_post->id();

		$content = $this->create_html_content( $pinned_post_id );

		$test_post = static::factory()
			->post
			->with_meta(
				[
					'wp_curate_deduplication'       => '1',
					'wp_curate_unique_pinned_posts' => '1',
				]
			)
			->create_and_get( [ 'post_content' => $content ] );

		$page = $this->get( $test_post )->assertOk();

		$this->assertEquals( 1, substr_count( $page->get_content(), 'Pinned Post 2' ) );
	}
}
