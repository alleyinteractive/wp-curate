<?php
/**
 * WP Curate Tests: Base Test Class
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Tests;

use Mantle\Support\Collection;
use Mantle\Testing\Block_Factory;
use Mantle\Testing\Concerns\Refresh_Database;
use Mantle\Testkit\Test_Case as TestkitTest_Case;
use PHPUnit\Framework\Attributes\BeforeClass;
use WP_Post;

use function Mantle\Support\Helpers\collect;

/**
 * WP Curate Base Test Case
 */
abstract class TestCase extends TestkitTest_Case {
	use Refresh_Database;

	/**
	 * Register block factory presets before any tests run.
	 */
	#[BeforeClass]
	public static function register_block_preset(): void {
		Block_Factory::register_preset( 'wp-curate/query', function ( Block_Factory $factory, array $attributes, bool $include_excerpts = true ): string {
			$attributes['numberOfPosts'] = $attributes['numberOfPosts'] ?? 5;
			$attributes['postTypes']     = $attributes['postTypes'] ?? [ 'post' ];

			// Ensure the 'posts' attribute is set. It should match the length of
			// numberOfPosts with null values.
			for ( $i = 0; $i < $attributes['numberOfPosts']; $i++ ) {
				$attributes['posts'][ $i ] = $attributes['posts'][ $i ] ?? null;
			}

			$inner_post = [ $factory->block( 'wp-curate/post-title' ) ];

			if ( $include_excerpts ) {
				$inner_post[] = $factory->block( 'post-excerpt' );
			}

			return $factory->block(
				name: 'wp-curate/query',
				attributes: $attributes,
				content: sprintf(
					'<div class="wp-block-wp-curate-query">%s</div>',
					$factory->block(
						name: 'post-template',
						content: $factory->block(
							name: 'wp-curate/post',
							content: sprintf(
								'<div class="wp-block-wp-curate-post">%s</div>',
								$factory->blocks( ...$inner_post ),
							),
						),
					),
				),
			);
		} );
	}

	/**
	 * Create an ordered set of posts and return their objects.
	 *
	 * @param int                  $count Number of posts to create.
	 * @param array<string, mixed> $arguments Additional arguments for post creation.
	 *
	 * @return Collection<int, WP_Post> Array of post objects.
	 */
	protected static function create_ordered_set( int $count, array $arguments = [] ): Collection {
		return collect( static::factory()->post->create_ordered_set( $count, $arguments ) )
			->map( fn ( int $id ): WP_Post => get_post( $id ) );
	}

	/**
	 * Run before each test.
	 */
	protected function setUp(): void {
		parent::setUp();

		$this->set_permalink_structure( '/%postname%/' );
	}

	/**
	 * Set the front page post for the site.
	 *
	 * @param int|WP_Post $page_id The page ID to set as the front page.
	 */
	protected function set_front_page( int|WP_Post $page_id ): void {
		if ( $page_id instanceof WP_Post ) {
			$page_id = $page_id->ID;
		}

		update_option( 'show_on_front', 'page' );
		update_option( 'page_on_front', $page_id );
	}
}
