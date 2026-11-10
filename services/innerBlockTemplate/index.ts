// WordPress dependencies.
import { BlockInstance, InnerBlockTemplate } from '@wordpress/blocks';

/**
 * Converts blocks to a template in the shape of `InnerBlockTemplate`.
 *
 * @param blocks Blocks.
 */
export default function toInnerBlockTemplate(blocks: BlockInstance[]): InnerBlockTemplate[] {
  return blocks.map(({
    attributes,
    innerBlocks,
    name,
  }) => [name, attributes, toInnerBlockTemplate(innerBlocks)]);
}
