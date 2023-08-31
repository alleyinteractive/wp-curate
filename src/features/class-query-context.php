<?php
/**
 * Query_Context class file
 *
 * @package the-wrap
 */

namespace Alley\WP\WP_Curate;

use Alley\WP\WP_Curate\Curated_Heading;
use Alley\WP\WP_Curate\Curated_Posts;
use Alley\WP\WP_Curate\Default_Validators;
use Alley\WP\WP_Curate\Feature;

/**
 * Provides context to query blocks based on the homepage settings.
 */
final class Query_Context implements Feature {
	/**
	 * Set up.
	 *
	 * @param Default_Validators $validators       Validation logic.
	 * @param array              $settings         Homepage settings.
	 * @param Curated_Posts      $curation_posts   Curated posts.
	 * @param Curated_Heading    $curation_heading Curated heading.
	 */
	public function __construct(
		private readonly Default_Validators $validators,
		private readonly array $settings,
		private readonly Curated_Posts $curation_posts,
		private readonly Curated_Heading $curation_heading,
	) {}

	/**
	 * Boot the feature.
	 */
	public function boot(): void {
		add_filter( 'render_block_context', [ $this, 'filter_query_context' ], 10, 2 );
	}

	/**
	 * Filters the context provided to a 'the-wrap/query' block.
	 *
	 * @param array $context      Default context.
	 * @param array $parsed_block Block being rendered.
	 * @return array Updated context.
	 */
	public function filter_query_context( $context, $parsed_block ) {
		die('here');
		if ( ! $this->validators->block_name( 'the-wrap/query' )->isValid( $parsed_block ) ) {
			return $context;
		}

		if ( isset( $parsed_block['attrs']['name'] ) ) {
			$name     = $parsed_block['attrs']['name'];
			$settings = [];

			if ( 'homepage-curated-10' === $name ) {
				if ( isset( $this->settings['curated_10'] ) && is_array( $this->settings['curated_10'] ) ) {
					$settings = $this->settings['curated_10'];
				}

				$context = $this->curation_posts->with_query_context( $context, $settings, 4 );
			}

			if ( 'homepage-latest-top' === $name ) {
				$context = $this->curation_posts->with_query_context(
					$context,
					[ 'provider' => 'unfiltered' ],
					5,
				);
			}

			if ( 'homepage-latest-bottom' === $name ) {
				$context = $this->curation_posts->with_query_context(
					$context,
					[
						'provider' => 'unfiltered',
						'offset'   => 5,
					],
					5,
				);
			}

			if ( 'homepage-pro' === $name ) {
				if ( isset( $this->settings['wrap_pro'] ) && is_array( $this->settings['wrap_pro'] ) ) {
					$settings = $this->settings['wrap_pro'];
				}

				$context = $this->curation_posts->with_query_context( $context, $settings, 4 );
			}

			if ( 'homepage-curated-30' === $name ) {
				if ( isset( $this->settings['curated_30'] ) && is_array( $this->settings['curated_30'] ) ) {
					$settings = $this->settings['curated_30'];
				}

				$context = $this->curation_posts->with_query_context( $context, $settings, 4 );
				$context = $this->curation_heading->with_heading_context( $context, $settings );
			}

			if ( 'featured-columns' === $name ) {
				if ( isset( $this->settings['featured_columns'] ) && is_array( $this->settings['featured_columns'] ) ) {
					$settings = $this->settings['featured_columns'];
				}

				$context                      = $this->curation_posts->with_query_context( $context, $settings, 4 );
				$context['query']['postType'] = 'profile';
			}

			if ( 'homepage-curated-40' === $name ) {
				if ( isset( $this->settings['curated_40'] ) && is_array( $this->settings['curated_40'] ) ) {
					$settings = $this->settings['curated_40'];
				}

				$context = $this->curation_posts->with_query_context( $context, $settings, 4 );
				$context = $this->curation_heading->with_heading_context( $context, $settings );
			}

			if ( 'homepage-curated-60' === $name ) {
				if ( isset( $this->settings['curated_60'] ) && is_array( $this->settings['curated_60'] ) ) {
					$settings = $this->settings['curated_60'];
				}

				$context = $this->curation_posts->with_query_context( $context, $settings, 4 );
				$context = $this->curation_heading->with_heading_context( $context, $settings );
			}

			$context['curation'] = $settings;
		}

		return $context;
	}
}
