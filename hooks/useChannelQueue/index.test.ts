// Internal dependencies.
import { channelQueueIds } from './index';

jest.mock('@wordpress/block-editor', () => ({
  store: 'core/block-editor',
}));

jest.mock('@wordpress/data', () => ({
  useSelect: jest.fn(),
}));

/**
 * A `select` function with the given blocks and a channel record with the given IDs.
 *
 * @param blocks Blocks in the editor.
 * @param ids    IDs in the channel.
 */
function fakeSelect(blocks: object[], ids: number[]) {
  const getChannel = jest.fn(() => ({
    entity_kind: 'postType',
    has_more: true,
    ids,
    label: 'Test',
    order: 'desc',
    order_label: 'Test order',
    post_types: {},
    uses_context: [],
  }));

  const select = jest.fn((storeName: string) => {
    let selectors: object = {
      getChannel,
    };

    if (storeName === 'core/block-editor') {
      selectors = {
        getBlocks: () => blocks,
        getSettings: () => ({}),
      };
    }

    return selectors;
  });

  return {
    getChannel,
    select,
  };
}

/**
 * A block that takes one ID from a channel.
 *
 * @param clientId Client ID.
 */
function singleBlock(clientId: string) {
  return {
    attributes: {
      channel: 'latest_posts',
      ref: 0,
    },
    clientId,
    innerBlocks: [],
  };
}

describe('channelQueueIds', () => {
  it('passes every argument to getChannel, so that calls for the same IDs share a request', () => {
    const {
      getChannel,
      select,
    } = fakeSelect([singleBlock('a'), singleBlock('b')], [11, 12, 13]);

    expect(channelQueueIds(select, 'b')).toEqual([12]);
    expect(getChannel.mock.calls.length).toBeGreaterThan(0);

    getChannel.mock.calls.forEach((args: unknown[]) => {
      expect(args).toEqual(['latest_posts', {}, 10]);
    });
  });

  it('asks for the next page when the blocks need more IDs than the first page has', () => {
    const blocks = Array.from({ length: 11 }, (_, index) => singleBlock(String(index)));
    const {
      getChannel,
      select,
    } = fakeSelect(blocks, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

    expect(channelQueueIds(select, '10')).toEqual([11]);
    expect(getChannel).toHaveBeenCalledWith('latest_posts', {}, 20);
  });
});
