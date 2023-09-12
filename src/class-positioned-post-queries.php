<?php
/**
 * Positioned_Post_Queries class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

use Alley\WP\Legal_Object_IDs;
use Alley\WP\Post_IDs\Post_IDs_Envelope;
use Alley\WP\Post_Queries\Exclude_Queries;
use Alley\WP\Post_Query\Post_IDs_Query;
use Alley\WP\Types\Post_Queries;
use Alley\WP\Types\Post_Query;

/**
 * Fills gaps in a map of positioned posts with dynamic posts.
 *
 * The given posts are injected into all queries, so this class is not safe to use with paginated queries.
 */
final class Positioned_Post_Queries implements Post_Queries {
	/**
	 * Set up.
	 *
	 * @param int[]|null[] $positioned       An indexed array where each value is a pinned post or null to indicate
	 *                                       that the position should be filled dynamically.
	 * @param int          $default_per_page Default posts per page if not specified in args.
	 * @param Post_Queries $origin           Post_Queries object.
	 */
	public function __construct(
		private readonly array $positioned,
		private readonly int $default_per_page,
		private readonly Post_Queries $origin,
	) {}

	/**
	 * Query for posts using literal arguments.
	 *
	 * @param array<string, mixed> $args Query arguments.
	 * @return Post_Query
	 */
	public function query( array $args ): Post_Query {
		$expected_per_page = $this->default_per_page;

		if ( isset( $args['posts_per_page'] ) && is_numeric( $args['posts_per_page'] ) ) {
			$expected_per_page = (int) $args['posts_per_page'];
		}

		$ids = new Legal_Object_IDs( new Post_IDs_Envelope( $this->positioned ) );

		if ( count( $ids->post_ids() ) >= $expected_per_page ) {
			$per_page_post_ids = \array_slice( $ids->post_ids(), 0, $expected_per_page );

			return new Post_IDs_Query( $per_page_post_ids );
		}

		$args['posts_per_page'] = $expected_per_page - \count( $ids->post_ids() );

		$backfill     = new Exclude_Queries( $ids, $args['posts_per_page'], $this->origin );
		$backfill_ids = $backfill->query( $args )->post_ids();

		$out = $this->positioned;

		// Insert dynamic posts into the available slots in the map of positioned posts.
		do {
			if ( null === current( $out ) ) {
				$out[ key( $out ) ] = array_shift( $backfill_ids );
			}
		} while ( next( $out ) !== false && count( $backfill_ids ) > 0 );

		// Respect that 'posts_per_page' might have been higher than the length of the map.
		array_push( $out, ...$backfill_ids );

		return new Post_IDs_Query( ( new Legal_Object_IDs( new Post_IDs_Envelope( $out ) ) )->post_ids() );
	}
}
