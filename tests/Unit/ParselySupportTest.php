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
use ReflectionException;
use ReflectionMethod;

/**
 * Tests the Parse.ly compatibility layer.
 */
class ParselySupportTest extends TestCase {
	/**
	 * Test support for Parse.ly versions.
	 *
	 * @param string $version The Parse.ly version.
	 * @param bool   $expected Whether the version is supported.
	 */
	#[DataProvider( 'supported_version_provider' )]
	public function test_is_supported_version( string $version, bool $expected ): void {
		try {
			$method = new ReflectionMethod( Parsely_Support::class, 'is_supported_version' );
		} catch ( ReflectionException ) {
			self::fail( 'Parse.ly version support must be checked before enabling the feature.' );
		}

		$actual = $method->invoke( null, $version );

		self::assertSame( $expected, $actual );
	}

	/**
	 * Provide Parse.ly version support cases.
	 *
	 * @return iterable<string, array{string, bool}>
	 */
	public static function supported_version_provider(): iterable {
		yield 'Parse.ly 3.20.3 is not supported' => [ '3.20.3', false ];
		yield 'Parse.ly 3.20.4 is supported' => [ '3.20.4', true ];
		yield 'newer Parse.ly versions are supported' => [ '3.24.1', true ];
	}

	/**
	 * Test conversion of legacy arguments for the supported Content API.
	 *
	 * @param array<string, mixed> $args The legacy API arguments.
	 * @param array<string, mixed> $expected The expected Content API arguments.
	 */
	#[DataProvider( 'content_api_args_provider' )]
	public function test_get_content_api_args( array $args, array $expected ): void {
		$method = new ReflectionMethod( Parsely_Support::class, 'get_content_api_args' );
		$actual = $method->invoke( new Parsely_Support(), $args );

		self::assertSame( $expected, $actual );
	}

	/**
	 * Provide supported Content API argument cases.
	 *
	 * @return iterable<string, array{array<string, mixed>, array<string, mixed>}>
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

		yield 'tags are converted to individual values while section remains scalar' => [
			$base_args,
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
				'section' => 'news, politics',
			],
			[
				'tag'     => [ 'featured', 'breaking-news' ],
				'section' => 'news, politics',
			],
		];
	}
}
