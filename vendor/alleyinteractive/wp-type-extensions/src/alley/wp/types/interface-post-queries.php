<?php
/**
 * Post_Queries interface file
 *
 * @package wp-type-extensions
 */

namespace Alley\WP\Types;

/**
 * Describes objects that can perform common queries for posts.
 */
interface Post_Queries {
	/**
	 * Query for posts using literal arguments.
	 *
	 * @param array<string, mixed> $args Query arguments.
	 * @return Post_Query
	 */
	public function query( array $args ): Post_Query;
}
