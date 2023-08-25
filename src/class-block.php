<?php
/**
 * Block class file
 *
 * @package wp-curate
 */

namespace Alley\WP\WP_Curate;

/**
 * A single block.
 */
final class Block implements Serialized_Blocks {
	/**
	 * Set up.
	 *
	 * @param string               $block_name Block name.
	 * @param array<string, mixed> $attrs      Block attributes.
	 * @param string               $inner_html Block inner HTML.
	 */
	private function __construct(
		private readonly string $block_name,
		private readonly array $attrs,
		private readonly string $inner_html,
	) {}

	/**
	 * Create instance from a name or more.
	 *
	 * @param string               $name                Block name.
	 * @param array<string, mixed> $attrs Block attributes.
	 * @param string               $html                Block inner HTML.
	 * @return self
	 */
	public static function create( string $name, array $attrs = [], string $html = '' ): self {
		return new self( $name, $attrs, $html );
	}

	/**
	 * Parsed block instance.
	 *
	 * @return array{
	 *   blockName: string,
	 *   attrs: array<string, mixed>,
	 *   innerBlocks?: mixed[],
	 *   innerHTML?: string,
	 *   innerContent?: string[],
	 * }
	 */
	public function parsed_block(): array {
		return [
			'blockName'    => $this->block_name,
			'attrs'        => $this->attrs,
			'innerBlocks'  => [],
			'innerHTML'    => $this->inner_html,
			'innerContent' => [ $this->inner_html ],
		];
	}

	/**
	 * Serialized block content.
	 *
	 * @return string
	 */
	public function serialize(): string {
		return serialize_block( $this->parsed_block() );
	}
}
