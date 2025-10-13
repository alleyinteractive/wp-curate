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
				'title'       => __( 'WP Curate Query: List', 'wp-curate' ),
				'description' => _x( 'A list style query block.', 'Block pattern description', 'wp-curate' ),
				'content'     => '<!-- wp:wp-curate/query {"postTypes":["post"]} --><div class="wp-block-wp-curate-query"><!-- wp:post-template --><!-- wp:wp-curate/post --><div class="wp-block-wp-curate-post"><!-- wp:post-featured-image /--><!-- wp:post-title {"isLink":true} /--></div><!-- /wp:wp-curate/post --><!-- /wp:post-template --></div><!-- /wp:wp-curate/query -->',
				'categories'  => [ 'curate' ],
				'keywords'    => [ 'curate', 'query', 'list' ],
				// 'inserter'    => false,
			],
		);
	}
}
