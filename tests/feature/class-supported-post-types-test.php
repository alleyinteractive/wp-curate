<?php
/**
 * WP Curate Tests: Supported Post Types Feature Test
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Tests\Feature;

use Alley\WP\WP_Curate\Supported_Post_Types;
use Alley\WP\WP_Curate\Tests\Test_Case;

/**
 * Supported_Post_Types_Test feature test.
 */
class Supported_Post_Types_Test extends Test_Case {

	public function test_get_default_post_types(): void {
		$post_types = new Supported_Post_Types();

		$this->assertIsArray( $post_types->get_supported_post_types() );
		$this->assertContains( 'post', $post_types->get_supported_post_types() );
	}

	public function test_get_excluded_post_types(): void {
		$post_types = new Supported_Post_Types();

		add_filter( 'wp_curate_supported_post_types', fn () => [ 'page' ] );

		$this->assertNotContains( 'post', $post_types->get_supported_post_types() );
		$this->assertContains( 'page', $post_types->get_supported_post_types() );

		remove_filter( 'wp_curate_supported_post_types', fn () => [ 'page' ] );
	}

	public function test_returning_default_load(): void {
		$post_types = new Supported_Post_Types();

		$this->assertTrue( $post_types->load() );
		$this->assertTrue( $post_types->load( [ 'page' ] ) );
	}

	public function test_hooking_into_load(): void {
		$post_types = new Supported_Post_Types();

		add_filter( 'wp_curate_load', '__return_true' );

		$this->assertTrue( $post_types->load() );

		remove_filter( 'wp_curate_load', '__return_true' );
	}
}
