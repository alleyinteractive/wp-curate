// Internal dependencies.
import { channelQueueIds } from './index';

jest.mock('@wordpress/block-editor', () => ({
  store: 'core/block-editor',
}));

jest.mock('@wordpress/blocks', () => ({
  store: 'core/blocks',
}));

jest.mock('@wordpress/data', () => ({
  useSelect: jest.fn(),
}));

/**
 * A `select` function with the given blocks and a channel record with the given IDs.
 *
 * @param blocks         Blocks in the editor.
 * @param ids            IDs in every channel.
 * @param defaultChannel The post's default channel.
 * @param loading        Channels that have not loaded.
 */
function fakeSelect(
  blocks: object[],
  ids: number[],
  defaultChannel = '',
  loading: string[] = [],
) {
  const getChannel = jest.fn((name: string) => (loading.includes(name) ? null : {
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
      getChannels: () => [
        { is_default: true, label: 'Global', name: 'global_default' },
        { is_default: false, label: 'Post default', name: 'post_default' },
      ],
    };

    if (storeName === 'core/block-editor') {
      selectors = {
        getBlocks: () => blocks,
        getSettings: () => ({}),
      };
    }

    // Only Many Posts gives its channel to the blocks inside it.
    if (storeName === 'core/blocks') {
      selectors = {
        getBlockType: (name: string) => ({
          providesContext: name === 'wp-curate/many-posts' ? { 'wp-curate/channel': 'channel' } : {},
          supports: { 'wp-curate/channel': true },
        }),
      };
    }

    if (storeName === 'core/editor') {
      selectors = {
        getEditedPostAttribute: () => ({ wp_curate_default_channel: defaultChannel }),
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
 * @param channel  Channel name.
 */
function singleBlock(clientId: string, channel = 'latest_post') {
  return {
    attributes: {
      channel,
      ref: 0,
    },
    clientId,
    innerBlocks: [],
    name: 'wp-curate/single-post',
  };
}

/**
 * A block that holds other blocks.
 *
 * @param name        Block name.
 * @param attributes  Block attributes.
 * @param innerBlocks Inner blocks.
 */
function parentBlock(name: string, attributes: object, innerBlocks: object[]) {
  return {
    attributes,
    clientId: name,
    innerBlocks,
    name,
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
      expect(args).toEqual(['latest_post', {}, 10]);
    });
  });

  it('asks for the next page when the blocks need more IDs than the first page has', () => {
    const blocks = Array.from({ length: 11 }, (_, index) => singleBlock(String(index)));
    const {
      getChannel,
      select,
    } = fakeSelect(blocks, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

    expect(channelQueueIds(select, '10')).toEqual([11]);
    expect(getChannel).toHaveBeenCalledWith('latest_post', {}, 20);
  });

  it('gives a Many Posts channel to the blocks without one inside it, in document order', () => {
    const blocks = [
      singleBlock('before'),
      parentBlock('wp-curate/many-posts', { channel: 'latest_post' }, [
        singleBlock('first', ''),
        parentBlock('core/group', {}, [singleBlock('nested', '')]),
      ]),
      singleBlock('after'),
    ];
    const {
      select,
    } = fakeSelect(blocks, [11, 12, 13, 14]);

    expect(channelQueueIds(select, 'first')).toEqual([12]);
    expect(channelQueueIds(select, 'nested')).toEqual([13]);
    expect(channelQueueIds(select, 'after')).toEqual([14]);
  });

  it('gives a Many Posts channel to a block inside it that has its own, and keeps its pin', () => {
    const blocks = [
      parentBlock('wp-curate/many-posts', { channel: 'latest_page' }, [
        singleBlock('moved'),
        { ...singleBlock('pinned'), attributes: { channel: 'latest_post', ref: 99 } },
        singleBlock('last', ''),
      ]),
    ];
    const {
      getChannel,
      select,
    } = fakeSelect(blocks, [11, 99, 12]);

    expect(channelQueueIds(select, 'moved')).toEqual([11]);
    expect(channelQueueIds(select, 'pinned')).toEqual([99]);
    expect(channelQueueIds(select, 'last')).toEqual([12]);
    expect(getChannel).not.toHaveBeenCalledWith('latest_post', {}, 10);
  });

  it('gives no channel to the blocks inside a Many Posts block that has none', () => {
    const blocks = [
      parentBlock('wp-curate/many-posts', { channel: 'outer' }, [
        parentBlock('wp-curate/many-posts', { channel: '' }, [singleBlock('inner', '')]),
      ]),
    ];
    const {
      getChannel,
      select,
    } = fakeSelect(blocks, [11], 'post_default');

    expect(channelQueueIds(select, 'inner')).toEqual([]);
    expect(getChannel).not.toHaveBeenCalled();
  });

  it('gives the post default channel to a block without a channel or an ancestor with one', () => {
    const {
      getChannel,
      select,
    } = fakeSelect([singleBlock('alone', '')], [11], 'post_default');

    expect(channelQueueIds(select, 'alone')).toEqual([11]);
    expect(getChannel).toHaveBeenCalledWith('post_default', {}, 10);
  });

  it('gives the global default channel to a block when the post has no default', () => {
    const {
      getChannel,
      select,
    } = fakeSelect([singleBlock('alone', '')], [11]);

    expect(channelQueueIds(select, 'alone')).toEqual([11]);
    expect(getChannel).toHaveBeenCalledWith('global_default', {}, 10);
  });

  it('makes only the blocks in a loading channel wait', () => {
    const blocks = [
      singleBlock('first'),
      singleBlock('switched', 'latest_page'),
      singleBlock('second'),
      singleBlock('after', 'latest_page'),
    ];
    const {
      select,
    } = fakeSelect(blocks, [11, 12, 13], '', ['latest_page']);

    expect(channelQueueIds(select, 'first')).toEqual([11]);
    expect(channelQueueIds(select, 'switched')).toBeNull();
    expect(channelQueueIds(select, 'second')).toEqual([12]);
    expect(channelQueueIds(select, 'after')).toBeNull();
  });

  it('makes the blocks inside a loading block wait, without requesting their channel', () => {
    const blocks = [
      parentBlock('wp-curate/single-post', { channel: 'latest_page', ref: 0 }, [
        singleBlock('inside', 'latest_post'),
      ]),
    ];
    const {
      getChannel,
      select,
    } = fakeSelect(blocks, [11], '', ['latest_page']);

    expect(channelQueueIds(select, 'inside')).toBeNull();
    expect(getChannel).not.toHaveBeenCalledWith('latest_post', expect.anything(), expect.anything());
  });
});
