<?php
/**
 * Block Patterns class file
 *
 * @package WP_Curate
 */

namespace Alley\WP\WP_Curate\Features;

use Alley\WP\Types\Feature;

/**
 * Class to register block patterns
 */
final class Block_Patterns implements Feature {
	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_action( 'init', [ $this, 'register_patterns' ], 100 );
	}

	/**
	 * Register block patterns.
	 */
	public function register_patterns(): void {
		register_block_pattern(
			'wp-curate/query-list',
			[
				'title'       => __( 'WP Curate Query: 3up', 'wp-curate' ),
				'description' => __( 'A 3up query block.', 'wp-curate' ),
				'content'     => '<!-- wp:wp-curate/query {"numberOfPosts":3,"postTypes":["post"],"className":"threeup"} --><div class="wp-block-wp-curate-query threeup"><!-- wp:post-template --><!-- wp:wp-curate/post --><div class="wp-block-wp-curate-post"><!-- wp:post-featured-image /--><!-- wp:post-title {"isLink":true,"fontSize":"large"} /--></div><!-- /wp:wp-curate/post --><!-- /wp:post-template --></div><!-- /wp:wp-curate/query -->',
				'categories'  => [ 'curate' ],
				'keywords'    => [ 'curate', 'query', 'threeup' ],
				'blockTypes'  => [ 'wp-curate/query' ],
			],
		);
		register_block_pattern(
			'wp-curate/query-list-2',
			[
				'title'       => __( 'WP Curate Query: 1 x 2', 'wp-curate' ),
				'description' => __( 'A query block with one large post and two smaller posts.', 'wp-curate' ),
				'content'     => '<!-- wp:wp-curate/query {"numberOfPosts":3,"postTypes":["post"],"className":"onextwo"} --><div class="wp-block-wp-curate-query onextwo"><!-- wp:post-template --><!-- wp:wp-curate/post --><div class="wp-block-wp-curate-post"><!-- wp:post-featured-image /--><!-- wp:post-title {"isLink":true,"fontSize":"large"} /--></div><!-- /wp:wp-curate/post --><!-- /wp:post-template --></div><!-- /wp:wp-curate/query -->',
				'categories'  => [ 'curate' ],
				'keywords'    => [ 'curate', 'query', 'list' ],
				'blockTypes'  => [ 'wp-curate/query' ],
			],
		);
	}
}
