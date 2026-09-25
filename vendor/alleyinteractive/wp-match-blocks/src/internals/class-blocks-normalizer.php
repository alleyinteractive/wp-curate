<?php
/**
 * Blocks_Normalizer class file. This class is not subject to semantic-versioning constraints
 *
 * (c) Alley <info@alley.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * @package wp-match-blocks
 */

namespace Alley\WP\Internals;

use Alley\WP\Blocks\Parsed_Block;
use Alley\WP\Types\Serialized_Blocks;
use Alley\WP\Validator\Nonempty_Block;
use Symfony\Component\Serializer\Exception\InvalidArgumentException;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;

/**
 * Normalizes an instance of the Serialized_Blocks interface.
 */
final class Blocks_Normalizer implements NormalizerInterface {
	/**
	 * Validates that only non-empty blocks are serialized.
	 *
	 * @var Nonempty_Block
	 */
	private Nonempty_Block $nonempty_block;

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->nonempty_block = new Nonempty_Block();
	}

	/**
	 * Normalizes an object into a set of arrays/scalars.
	 *
	 * @throws InvalidArgumentException Occurs when the object given is not a supported type for the normalizer.
	 *
	 * @phpstan-param array<mixed> $context
	 * @phpstan-return array{block?: Parsed_Block[]}
	 *
	 * @param mixed       $object  Object to normalize.
	 * @param string|null $format  Format the normalization result will be encoded as.
	 * @param array       $context Context options for the normalizer.
	 * @return array
	 */
	public function normalize( mixed $object, ?string $format = null, array $context = [] ): array {
		if ( ! $object instanceof Serialized_Blocks ) {
			throw new InvalidArgumentException( 'The object must be an instance of Serialized_Blocks' );
		}

		$parsed = parse_blocks( $object->serialized_blocks() );

		if ( ! is_array( $parsed ) ) {
			return [];
		}

		$parsed = array_filter( $parsed, [ $this->nonempty_block, 'isValid' ] );

		if ( count( $parsed ) === 0 ) {
			return [];
		}

		return [
			'block' => array_map(
				fn ( $block ) => new Parsed_Block( $block ),
				$parsed
			),
		];
	}

	/**
	 * Checks whether the given class is supported for normalization by this normalizer.
	 *
	 * @phpstan-param array<mixed> $context
	 *
	 * @param mixed       $data    Data to normalize.
	 * @param string|null $format  The format being (de-)serialized from or into.
	 * @param array       $context Context options for the normalizer.
	 * @return bool
	 */
	public function supportsNormalization( mixed $data, ?string $format = null, array $context = [] ): bool {
		return $data instanceof Serialized_Blocks && 'xml' === $format;
	}

	/**
	 * Returns the types potentially supported by this normalizer.
	 *
	 * For each supported formats (if applicable), the supported types should be
	 * returned as keys, and each type should be mapped to a boolean indicating
	 * if the result of supportsNormalization() can be cached or not
	 * (a result cannot be cached when it depends on the context or on the data.)
	 * A null value means that the normalizer does not support the corresponding
	 * type.
	 *
	 * Use type "object" to match any classes or interfaces,
	 * and type "*" to match any types.
	 *
	 * @param string|null $format The format being (de-)serialized from or into.
	 * @return bool[]
	 */
	public function getSupportedTypes( ?string $format ): array {
		return [ '*' => true ];
	}
}
