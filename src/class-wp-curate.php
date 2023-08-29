<?php
/**
 * WP_Curate class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

/**
 * Example Plugin
 */
class WP_Curate {

    /**
	 * Get the query heading based on the curation settings.
	 *
	 * @param array<mixed> $curation Curation settings.
	 * @return string Query heading.
	 */
	public static function get_query_heading( array $curation ): string {
        $heading  = '';
        $provider = $curation[ 'provider' ];
        
        if ( taxonomy_exists( $provider ) && isset( $curation[ $provider ] ) && is_numeric( $curation[ $provider ] ) ) { // @phpstan-ignore-line
            $term = get_term( $curation[ $provider ], $provider ); // @phpstan-ignore-line

            if ( $term instanceof \WP_Term ) {
                $heading = html_entity_decode( $term->name );
            }
        }

        /**
         * Filters the query heading.
         *
         * @param string $heading  Default heading.
         * @param array  $curation Curation settings.
         */
        $heading = apply_filters( 'wp_curate_query_heading', $heading, $curation );

        return $heading;
    }
}
