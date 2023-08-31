<?php
/**
 * Contains the main plugin function
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

/**
 * Instantiate the plugin.
 *
 * @throws \Exception For bad parameters.
 */
function main(): void {
	$features[] = new Query_Context(
		validators: $validators,
		settings: is_array( $homepage_option ) ? $homepage_option : [],
		curation_posts: new Curated_Posts(
			queries: new Variable_Queries(
				input: $environment_type,
				test: $validators->identical_to( 'production' ),
				// On production, require posts to be under 1 year old, and assume they'll probably be from the last 90 days.
				is_true: new Enforced_Date_Queries(
					after: new DateTimeImmutable( '-1 year' ),
					origin: new Optimistic_Date_Queries(
						after: [
							new DateTimeImmutable( '-3 days' ),
							new DateTimeImmutable( '-30 days' ),
							new DateTimeImmutable( '-90 days' ),
						],
						posts_per_page: $default_posts_per_page,
						origin: $default_queries,
					),
				),
				// Off production, require posts to be under 5 years old, and assume that content will be refreshed around once a year.
				is_false: new Enforced_Date_Queries(
					after: new DateTimeImmutable( '-5 years' ),
					origin: new Optimistic_Date_Queries(
						after: [
							new DateTimeImmutable( '-1 year' ),
						],
						posts_per_page: $default_posts_per_page,
						origin: $default_queries,
					),
				),
			),
			stop_query_var: $stop_query_var,
		),
		curation_heading: new Curated_Heading(),
	);
	$features[] = new Homepage_Main_Query(
		stop_query_var: $stop_query_var,
	);

	foreach ( $features as $feature ) {
		$feature->boot();
	}
}

