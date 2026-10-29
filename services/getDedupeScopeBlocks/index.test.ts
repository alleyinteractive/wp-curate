import type { Block } from '../../types/block';
import getDedupeScopeBlocks from './index';

const block = (clientId: string, name: string): Block => ({
  attributes: {},
  clientId,
  name,
});

const postContentChildren = [block('query-1', 'wp-curate/query')];
const allBlocks = [block('header', 'core/template-part'), block('content', 'core/post-content')];

/**
 * Mimics the block editor's getBlocks(): a client ID returns that block's
 * children, anything else (including an array of IDs) returns no blocks, and
 * no argument returns the top-level blocks.
 */
const getBlocks = (rootClientId?: unknown): Block[] => {
  if (rootClientId === undefined) {
    return allBlocks;
  }
  return rootClientId === 'content' ? postContentChildren : [];
};

describe('getDedupeScopeBlocks', () => {
  it('returns the post content blocks when there is one post content block', () => {
    const blocks = getDedupeScopeBlocks(() => ['content'], getBlocks);
    expect(blocks).toBe(postContentChildren);
  });

  it('returns all blocks when there is no post content block', () => {
    const blocks = getDedupeScopeBlocks(() => [], getBlocks);
    expect(blocks).toBe(allBlocks);
  });

  it('returns all blocks when there are multiple post content blocks', () => {
    const blocks = getDedupeScopeBlocks(() => ['content', 'content-2'], getBlocks);
    expect(blocks).toBe(allBlocks);
  });
});
