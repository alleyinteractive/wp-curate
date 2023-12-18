<?php
/**
 * Post_Query interface file
 *
 * @package wp-type-extensions
 */

namespace Alley\WP\Types;

use WP_Post;
use WP_Query;

/**
 * Describes an object that queries for posts.
 */
interface Post_Query {
	/**
	 * Query object.
	 *
	 * @return WP_Query
	 */
	public function query_object(): WP_Query;

	/**
	 * Found post objects.
	 *
	 * @return WP_Post[]
	 */
	public function post_objects(): array;

	/**
	 * Found post IDs.
	 *
	 * @return int[]
	 */
	public function post_ids(): array;
}
