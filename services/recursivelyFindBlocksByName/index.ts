import type { Block } from '../../types/block';

export default function recursivelyFindBlocksByName(
  block: Block,
  blockName: string | string[],
  out: Block[],
) {
  const blockNames = Array.isArray(blockName) ? blockName : [blockName];
  if (blockNames.includes(block.name)) {
    out.push(block);
  }
  const { innerBlocks } = block;
  if (!innerBlocks) {
    return;
  }
  innerBlocks.forEach((innerBlock) => {
    recursivelyFindBlocksByName(innerBlock, blockNames, out);
  });
}
