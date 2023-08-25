<?php
/**
 * Serialized_Blocks interface file
 *
 * @package wp-curate
 */

namespace WP_Curate\Core;

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
