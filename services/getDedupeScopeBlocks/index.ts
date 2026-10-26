import type { Block } from '../../types/block';

/**
 * Gets the blocks that page-wide deduplication should run over.
 *
 * There isn't support yet for deduplicating posts throughout an entire template.
 * If we're in template mode, narrow the scope to just the blocks in post content.
 *
 * @param getBlocksByName The block editor's getBlocksByName selector.
 * @param getBlocks The block editor's getBlocks selector.
 */
export default function getDedupeScopeBlocks(
  getBlocksByName: (blockName: string) => string[],
  getBlocks: (rootClientId?: string) => Block[],
): Block[] {
  const root = getBlocksByName('core/post-content');
  return root.length === 1 ? getBlocks(root[0]) : getBlocks();
}
