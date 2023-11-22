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
 * @param count The current count.
 */
export default function countBlocksByName(
  blocks: Block[],
  blockName: string,
  count = 0,
): number {
  let newCount = count;
  for (const block of blocks) {
    if (block.name === blockName) {
      newCount += 1;
    }
    if (block.innerBlocks && block.innerBlocks.length > 0) {
      newCount = countBlocksByName(block.innerBlocks, blockName, newCount);
    }
  }
  return newCount;
}
