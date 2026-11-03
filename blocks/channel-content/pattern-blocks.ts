// WordPress dependencies.
import { BlockInstance, cloneBlock } from '@wordpress/blocks';

// Plugin dependencies.
import { toChannelName } from '../../hooks/useBlockChannel';

/**
 * Copies of the blocks of a pattern, to replace a Channel Content block with. The first block keeps
 * the channel of the block that it replaces, unless the pattern gives it a channel.
 *
 * @param blocks  The blocks of the pattern.
 * @param channel The `channel` attribute of the block that the pattern replaces.
 */
export default function toPatternBlocks(
  blocks: BlockInstance[],
  channel: unknown,
): BlockInstance[] {
  return blocks.map((block, index) => {
    const patternChannel = toChannelName(block.attributes.channel);

    let out = cloneBlock(block);

    if (index === 0 && (patternChannel === null || patternChannel === '')) {
      out = cloneBlock(block, { channel });
    }

    return out;
  });
}
