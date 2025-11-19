import type { Block } from '../../types/block';

/**
 * Recursively finds all blocks with the specified name(s) within a block.
 * If a block matches, its innerBlocks will NOT be searched.
 *
 * @param {Block} block The block to search within.
 * @param {string | string[]} blockName The block name or names to search for.
 * @param {Block[]} out The array to push found blocks into. Updated by reference.
 */
export default function recursivelyFindBlocksByName(
  block: Block,
  blockName: string | string[],
  out: Block[],
) {
  const blockNames = Array.isArray(blockName) ? blockName : [blockName];
  if (blockNames.includes(block.name)) {
    out.push(block);
    return;
  }
  const { innerBlocks } = block;
  if (!innerBlocks) {
    return;
  }
  innerBlocks.forEach((innerBlock) => {
    recursivelyFindBlocksByName(innerBlock, blockNames, out);
  });
}
