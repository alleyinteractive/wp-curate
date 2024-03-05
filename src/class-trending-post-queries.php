<?php
/**
 * Trending_Post_Queries class file
 *
 * @package wp-type-extensions
 */

namespace Alley\WP\WP_Curate;

use Alley\WP\Types\Post_Queries;
use Alley\WP\Types\Post_Query;
use Alley\WP\Post_Query\WP_Query_Envelope;
use Alley\WP\WP_Curate\Features\Parsely_Support;
use Alley\WP\Post_Query\Post_IDs_Query;

/**
 * Pull trending posts from Parsely.
 */
final class Trending_Post_Queries implements Post_Queries {
	/**
	 * Set up.
	 *
	 * @param Post_Queries    $origin Post_Queries object.
	 * @param Parsely_Support $parsely Parsely_Support object.
	 */
	public function __construct(
		private readonly Post_Queries $origin,
		private readonly Parsely_Support $parsely
	) {}

	/**
	 * Query for posts using literal arguments.
	 *
	 * @param array<string, mixed> $args The arguments to be used in the query.
	 * @return Post_Query
	 */
	public function query( array $args ): Post_Query {
		if ( isset( $args['orderby'] ) && 'trending' === $args['orderby'] ) {
			$trending = $this->parsely->get_trending_posts( $args );
			if ( ! empty( $trending ) ) {
				return new Post_IDs_Query( $trending );
			}
		}

		return $this->origin->query( $args );
	}
}
