interface Block {
  clientId: string;
  name: string;
  innerBlocks: Block[];
}

/**
 * Count blocks by name.
 *
 * @param blocks An array of blocks.
 * @param blockName The name of the block to count.
 * @param result The result of the count.
 */
export default function countBlocksByName(
  blocks: Block[],
  blockName: string,
  result: Block[] | [{}] = [],
): number {
  for (const block of blocks) {
    if (block.name === blockName) {
      result.push(block);
    }
    if (block.innerBlocks && block.innerBlocks.length > 0) {
      countBlocksByName(block.innerBlocks, blockName, result);
    }
  }
  return result.length;
}
