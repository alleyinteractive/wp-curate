<?php
/**
 * Class file for WP_Utils.
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

/**
 * WordPress-specific helpers.
 */
class WP_Utils {
	/**
	 * Whether we're DOING_AUTOSAVE.
	 *
	 * @return bool
	 */
	public static function doing_autosave() {
		return ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE );
	}

	/**
	 * Whether something is a \WP_Post.
	 *
	 * @param mixed $thing Thing to check.
	 * @return bool
	 */
	public static function is_wp_post( $thing ) {
		return ( $thing instanceof \WP_Post );
	}

	/**
	 * Whether something is a \WP_Query.
	 *
	 * @param mixed $thing Thing to check.
	 * @return bool
	 */
	public static function is_wp_query( $thing ) {
		return ( $thing instanceof \WP_Query );
	}

	/**
	 * Whether something is a \WP_Term.
	 *
	 * @param mixed $thing Thing to check.
	 * @return bool
	 */
	public static function is_wp_term( $thing ) {
		return ( $thing instanceof \WP_Term );
	}

	/**
	 * Whether something is a \WP_User.
	 *
	 * @param mixed $thing Thing to check.
	 * @return bool
	 */
	public static function is_wp_user( $thing ) {
		return ( $thing instanceof \WP_User );
	}

	/**
	 * Sanitize a 'posts_per_page' value to help avoid nonperformant queries.
	 *
	 * @param int $value The value to sanitize.
	 * @return int Value between 1 and 100.
	 */
	public static function sanitize_posts_per_page( $value ) {
		return max( 1, min( 100, intval( $value ) ) );
	}

	/**
	 * Whether this is a WP_CLI session.
	 *
	 * @return bool
	 */
	public static function wp_cli() {
		return ( defined( 'WP_CLI' ) && WP_CLI );
	}

	/**
	 * Get the currently global $wp_query.
	 *
	 * @return mixed A query, in theory.
	 */
	public static function wp_query() {
		global $wp_query;
		return $wp_query;
	}

	/**
	 * Get the currently global $wp_the_query.
	 *
	 * @return mixed *The* query, in theory.
	 */
	public static function wp_the_query() {
		global $wp_the_query;
		return $wp_the_query;
	}

	/**
	 * Helper function to cache the return value of a function.
	 *
	 * @param string   $key Cache key.
	 * @param \Closure $callback Closure to invoke.
	 * @param string   $group Cache group.
	 * @param int      $ttl Cache TTL.
	 * @return mixed
	 */
	public static function remember( string $key, \Closure $callback, string $group = '', int $ttl = 3600 ) {
		$found = false;
		$value = wp_cache_get( $key, $group, false, $found );

		if ( $found ) {
			return $value;
		}

		$value = $callback();

		wp_cache_set( $key, $value, $group, $ttl ); // phpcs:ignore WordPressVIPMinimum.Performance.LowExpiryCacheTime.CacheTimeUndetermined

		return $value;
	}
}
