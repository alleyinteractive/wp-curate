<?php
/**
 * Block Name: Query Condition.
 *
 * @package wp-curate
 */

use wp_curate\Core\Global_Post_Query;
use wp_curate\Core\Validator\Slug_Is_In_Category;

/**
 * Registers the block using the metadata loaded from the `block.json` file.
 * Behind the scenes, it registers also all assets so they can be enqueued
 * through the block editor in the corresponding context.
 *
 * @see https://developer.wordpress.org/reference/functions/register_block_type/
 */
function wp_curate_condition_block_init(): void {
	// Register the block by passing the location of block.json.
	register_block_type(
		__DIR__,
		[
			'render_callback' => fn ( $attributes, $content ) => $content,
		],
	);
}
add_action( 'init', 'wp_curate_condition_block_init' );

/**
 * Evaluate the result of condition block attributes.
 *
 * @param array $parsed_block Parsed condition block.
 * @param array $context      Available context.
 * @return bool
 */
function wp_curate_condition_block_result( array $parsed_block, array $context ): bool {
	global $wp_query;

	$num_conditions = 0;
	$num_true       = 0;

	$conditions = [];

	if ( isset( $parsed_block['attrs'] ) && is_array( $parsed_block['attrs'] ) ) {
		$conditions = $parsed_block['attrs'];
	}

	if ( isset( $conditions['query'] ) && $wp_query instanceof WP_Query ) {
		// Map `{"query": "is_home"} to {"query": {"is_home": true}}`.
		if ( is_string( $conditions['query'] ) ) {
			$conditions['query'] = array_fill_keys( (array) $conditions['query'], true );
		}

		foreach ( $conditions['query'] as $condition => $expect ) {
			$num_conditions++;

			switch ( true ) {
				case 'is_singular' === $condition && ( is_string( $expect ) || is_array( $expect ) ):
					$result = $wp_query->is_singular( $expect );
					break;

				case 'is_page' === $condition && ( is_string( $expect ) || is_array( $expect ) ):
					$result = $wp_query->is_page( $expect );
					break;

				case 'is_tax' === $condition && ( is_string( $expect ) || is_array( $expect ) ):
					$result = $wp_query->is_tax( $expect );
					break;

				case method_exists( $wp_query, $condition ):
					$result = call_user_func( [ $wp_query, $condition ] ) === $expect;
					break;

				default:
					$result = false;
					break;
			}

			if ( false === $result ) {
				break;
			}

			$num_true++;
		}
	}

	/*
	 * Checks the index of how many times the parent condition block has been rendered, like:
	 *
	 * {"index": {"===": 0}}
	 * {"index": {">": 2}}
	 * {"index": {">": 2, "<": 4}}
	 *
	 * @see \Alley\Validator\Comparison for the available operators.
	 *
	 * Note that this approach means that two identical conditions with two identical set of
	 * child blocks will use the same counter.
	 */
	if ( isset( $conditions['index'] ) && is_array( $conditions['index'] ) ) {
		$num_conditions++;

		$validator = new \Laminas\Validator\ValidatorChain();

		foreach ( $conditions['index'] as $operator => $compared ) {
			try {
				$validator->attach(
					validator: new \Alley\Validator\Comparison(
						[
							'operator' => $operator,
							'compared' => $compared,
						],
					),
					breakChainOnFailure: true,
				);
			} catch ( Exception $exception ) {
				// Nothing yet.
				unset( $exception );
			}
		}

		if ( count( $validator ) > 0 ) {
			if ( $validator->isValid( wp_curate_current_counter_block() ) ) {
				$num_true++;
			}
		}
	}

	if (
		isset( $conditions['post'] )
		&& isset( $context['postId'] )
		&& is_numeric( $context['postId'] )
		&& $context['postId'] > 0
	) {
		$conditions['post'] = (array) $conditions['post'];

		foreach ( $conditions['post'] as $condition ) {
			$num_conditions++;

			if ( 'has_content' === $condition ) {
				if ( '' !== get_the_content( null, null, $context['postId'] ) ) {
					$num_true++;
				}

				continue;
			}

			/**
			 * Filters the condition block's result for the given post condition.
			 *
			 * @param bool   $result    Condition result.
			 * @param string $condition Condition name.
			 * @param int    $post_id   Post ID.
			 */
			if ( true === apply_filters( 'wp_curate_condition_block_post_condition', false, $condition, $context['postId'] ) ) {
				$num_true++;
			}
		}
	}

	if ( isset( $conditions['custom'] ) ) {
		$conditions['custom'] = (array) $conditions['custom'];

		foreach ( $conditions['custom'] as $condition ) {
			$num_conditions++;

			if ( 'is_column' === $condition ) {
				$check = new Slug_Is_In_Category( new Global_Post_Query() );

				if ( $check->isValid( 'category-column' ) || $check->isValid( 'category-hollyblog' ) ) {
					$num_true++;
				}
			}
		}
	}

	if ( isset( $conditions['condition'] ) ) {
		$conditions['condition'] = (array) $conditions['condition'];

		foreach ( $conditions['condition'] as $name ) {
			$num_conditions++;

			/**
			 * Filters the condition block's result for the given condition.
			 *
			 * @param bool     $result   Condition result.
			 * @param array    $context  Available context.
			 * @param WP_Query $wp_query Global query object.
			 */
			$result = apply_filters( "wp_curate_condition_block_{$name}_condition", false, $context, $wp_query );

			if ( true === $result ) {
				$num_true++;
			}
		}
	}

	return $num_conditions > 0 && $num_conditions === $num_true;
}
