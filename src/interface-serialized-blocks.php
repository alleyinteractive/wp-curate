<?php
/**
 * Serialized_Blocks interface file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

/**
 * Describes a class that serializes block content.
 */
interface Serialized_Blocks {
	/**
	 * Serialized block content.
	 *
	 * @return string
	 */
	public function serialize(): string;
}
