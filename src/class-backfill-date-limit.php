<?php
/**
 * Backfill_Date_Limit class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

use Alley\WP\Post_Queries\Optimistic_Date_Queries;
use Alley\WP\Types\Post_Queries;
use DateTimeImmutable;

/**
 * Resolves and applies the recency window that backfill queries (dynamically-filled query and
 * subquery block slots) should be limited to.
 *
 * An explicit per-block "Backfill Date Limit" choice always wins. The `wp_curate_backfill_date_limit`
 * filter only ever supplies a value when a block has been left at its "Site Default" setting, so a
 * sitewide default can never silently override an editor's explicit choice.
 */
final class Backfill_Date_Limit {
	/**
	 * Sentinel attribute value meaning "use the sitewide default".
	 *
	 * @var string
	 */
	public const ATTRIBUTE_DEFAULT = 'default';

	/**
	 * Sentinel value meaning "do not limit backfill queries by date".
	 *
	 * @var string
	 */
	public const UNLIMITED = 'unlimited';

	/**
	 * Resolve the effective backfill recency window for a block.
	 *
	 * @param string $attribute_value Raw 'backfillDateLimit' block attribute value ('default', a day
	 *                                count as a string, or 'unlimited').
	 * @return positive-int|'unlimited' A positive number of days, or the string 'unlimited'.
	 */
	public static function resolve( string $attribute_value ): int|string {
		if ( self::ATTRIBUTE_DEFAULT !== $attribute_value ) {
			return self::normalize( $attribute_value );
		}

		/**
		 * Filters the sitewide default number of days to limit backfill queries (dynamically-filled
		 * query and subquery block slots) to recently published posts. This only supplies a
		 * *default* — it never overrides a block whose "Backfill Date Limit" control has been
		 * explicitly set to something other than "Site Default".
		 *
		 * Return the string 'unlimited' (or a number less than or equal to 0) to disable
		 * date-limiting by default.
		 *
		 * @param int|string $days Default number of days, or 'unlimited'. Default 30.
		 */
		$default = apply_filters( 'wp_curate_backfill_date_limit', 30 );

		return self::normalize( $default );
	}

	/**
	 * Wrap a Post_Queries origin so that queries for the backfill shortfall are limited to the
	 * resolved recency window, gracefully falling back to the unconstrained origin if that window
	 * doesn't yield the full expected number of posts. Returns the origin unchanged when the
	 * resolved window is unlimited.
	 *
	 * @param string       $attribute_value  Raw 'backfillDateLimit' block attribute value.
	 * @param Post_Queries $origin           Backfill query origin to wrap.
	 * @param int          $default_per_page Default posts per page, used to know how many posts
	 *                                       the date-limited attempt is expected to return.
	 * @return Post_Queries
	 */
	public static function wrap( string $attribute_value, Post_Queries $origin, int $default_per_page ): Post_Queries {
		$days = self::resolve( $attribute_value );

		if ( self::UNLIMITED === $days ) {
			return $origin;
		}

		return new Optimistic_Date_Queries(
			after: [ new DateTimeImmutable( "-{$days} days", wp_timezone() ) ],
			posts_per_page: $default_per_page,
			origin: $origin,
		);
	}

	/**
	 * Normalize a raw day-count value into either a positive integer or the 'unlimited' sentinel.
	 *
	 * @param mixed $value Raw value, e.g. from a block attribute or the `wp_curate_backfill_date_limit` filter.
	 * @return positive-int|'unlimited'
	 */
	private static function normalize( mixed $value ): int|string {
		if ( self::UNLIMITED === $value ) {
			return self::UNLIMITED;
		}

		$days = is_numeric( $value ) ? (int) $value : 0;

		return $days > 0 ? $days : self::UNLIMITED;
	}
}
