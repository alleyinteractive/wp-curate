<?php
/**
 * WP Curate Tests: REST API Test
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Tests\Feature;

use Alley\WP\WP_Curate\Tests\TestCase;
use WP_REST_Request;

use function Mantle\Support\Helpers\now;

/**
 * Test the wp-curate/v1/posts endpoint that backfills the query block in the editor.
 */
class RestApiTest extends TestCase {
	/**
	 * Request post IDs from the endpoint.
	 *
	 * @param array<string, mixed> $params Request params.
	 * @return array<int> Post IDs.
	 */
	private function request_posts( array $params = [] ): array {
		$request = new WP_REST_Request( 'GET', '/wp-curate/v1/posts' );
		$request->set_query_params( $params );

		$response = rest_do_request( $request );

		$this->assertSame( 200, $response->get_status() );

		return $response->get_data();
	}

	/**
	 * Test that a private post is not returned to a user who can read private posts.
	 */
	public function test_private_posts_are_excluded(): void {
		$this->acting_as( 'administrator' );

		$published = static::factory()->post->create_ordered_set( 3 );
		$private   = static::factory()->post->create( [
			'post_status' => 'private',
			'post_date'   => now()->addMinute()->format( 'Y-m-d H:i:s' ),
		] );

		$ids = $this->request_posts( [ 'status' => 'publish' ] );

		$this->assertNotContains( $private, $ids );
		$this->assertEqualsCanonicalizing( $published, $ids );
	}

	/**
	 * Test that a status outside the allowlist falls back to published posts.
	 */
	public function test_disallowed_status_falls_back_to_publish(): void {
		$this->acting_as( 'administrator' );

		$published = static::factory()->post->create();
		$private   = static::factory()->post->create( [ 'post_status' => 'private' ] );
		$draft     = static::factory()->post->create( [ 'post_status' => 'draft' ] );

		$this->assertSame( [ $published ], $this->request_posts( [ 'status' => 'private' ] ) );
		$this->assertSame( [ $published ], $this->request_posts( [ 'status' => 'draft' ] ) );
		$this->assertNotContains( $private, $this->request_posts() );
		$this->assertNotContains( $draft, $this->request_posts() );
	}
}
