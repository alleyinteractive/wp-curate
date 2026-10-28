<?php
/**
 * Inner_Block_Template class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

use Alley\WP\Blocks\Blocks;
use Alley\WP\Blocks\Inner_Blocks_Prepended;
use Alley\WP\Blocks\Named_Block;
use Alley\WP\Types\Serialized_Blocks;

/**
 * A block template in the shape of the editor's `InnerBlockTemplate`.
 */
final readonly class Inner_Block_Template implements Serialized_Blocks {
	/**
	 * Constructor.
	 *
	 * @param mixed[] $template The template.
	 */
	public function __construct(
		private array $template,
	) {}

	/**
	 * Serialized block content.
	 *
	 * @return string
	 */
	public function serialized_blocks(): string {
		return $this->parsed_blocks()->serialized_blocks();
	}

	/**
	 * The blocks in the template. Items that are not in the shape of a template item are skipped.
	 *
	 * @return Serialized_Blocks
	 */
	private function parsed_blocks(): Serialized_Blocks {
		return Blocks::from_iterable(
			$this->template,
			function ( array $carry, mixed $item ): array {
				if ( ! is_array( $item ) || ! isset( $item[0] ) || ! is_string( $item[0] ) || '' === $item[0] ) {
					return $carry;
				}

				$attrs = [];

				if ( isset( $item[1] ) && is_array( $item[1] ) ) {
					// Attributes have string names.
					$attrs = array_filter( $item[1], 'is_string', ARRAY_FILTER_USE_KEY );
				}

				$block = new Named_Block( $item[0], $attrs );

				if ( isset( $item[2] ) && is_array( $item[2] ) ) {
					$block = new Inner_Blocks_Prepended( new self( $item[2] ), $block );
				}

				$carry[] = $block;

				return $carry;
			},
		);
	}
}
