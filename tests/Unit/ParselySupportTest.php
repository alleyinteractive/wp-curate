<?php
/**
 * WP Curate Tests: Parse.ly Support
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate\Tests\Unit;

use Alley\WP\WP_Curate\Features\Parsely_Support;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

/**
 * Tests the Parse.ly argument compatibility layer.
 */
class ParselySupportTest extends TestCase {
	/**
	 * Test conversion of legacy arguments for different Parse.ly versions.
	 *
	 * @param array<string, mixed> $args The legacy API arguments.
	 * @param string               $version The Parse.ly version.
	 * @param array<string, mixed> $expected The expected Content API arguments.
	 */
	#[DataProvider( 'content_api_args_provider' )]
	public function test_get_content_api_args( array $args, string $version, array $expected ): void {
		$method = new ReflectionMethod( Parsely_Support::class, 'get_content_api_args' );
		$actual = $method->invoke( new Parsely_Support(), $args, $version );

		self::assertSame( $expected, $actual );
	}

	/**
	 * Provide Content API argument compatibility cases.
	 *
	 * @return iterable<string, array{array<string, mixed>, string, array<string, mixed>}>
	 */
	public static function content_api_args_provider(): iterable {
		$base_args = [
			'limit'        => 5,
			'sort'         => 'views',
			'period_start' => '1d',
			'period_end'   => 'now',
			'tag'          => 'featured, breaking-news',
			'section'      => 'news, politics',
		];

		yield 'Parse.ly 3.17 uses arrays for tags and sections' => [
			$base_args,
			'3.17.0',
			array_merge(
				$base_args,
				[
					'tag'     => [ 'featured', 'breaking-news' ],
					'section' => [ 'news', 'politics' ],
				]
			),
		];

		yield 'Parse.ly 3.20.3 still uses an array for sections' => [
			$base_args,
			'3.20.3',
			array_merge(
				$base_args,
				[
					'tag'     => [ 'featured', 'breaking-news' ],
					'section' => [ 'news', 'politics' ],
				]
			),
		];

		yield 'Parse.ly 3.20.4 uses a scalar section' => [
			$base_args,
			'3.20.4',
			array_merge(
				$base_args,
				[
					'tag' => [ 'featured', 'breaking-news' ],
				]
			),
		];

		yield 'empty list values are removed' => [
			[
				'tag'     => 'featured, , breaking-news,',
				'section' => [ 'news', '', ' politics ' ],
			],
			'3.19.0',
			[
				'tag'     => [ 'featured', 'breaking-news' ],
				'section' => [ 'news', 'politics' ],
			],
		];
	}
}
