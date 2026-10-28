// Internal dependencies.
import { channelQueueContext, channelQueueIds } from './index';

jest.mock('@wordpress/block-editor', () => ({
  store: 'core/block-editor',
}));

jest.mock('@wordpress/blocks', () => ({
  store: 'core/blocks',
}));

jest.mock('@wordpress/data', () => ({
  useSelect: jest.fn(),
}));

// A channel of the posts in a term, which reads a `term` argument.
const IN_CATEGORY = 'post_category_latest';

// A channel of the articles in an issue, which reads the `postId` context.
const IN_ISSUE = 'articles_in_issue';

// The post in the editor.
const POST_ID = 5;

/**
 * A `select` function with the given blocks and a channel record with the given IDs.
 *
 * @param blocks         Blocks in the editor.
 * @param ids            IDs in every channel.
 * @param defaultChannel The post's default channel.
 * @param loading        Channels that have not loaded.
 * @param meta           More post meta, such as the deduplication settings.
 */
function fakeSelect(
  blocks: object[],
  ids: number[],
  defaultChannel = '',
  loading: string[] = [],
  meta: Record<string, unknown> = {},
) {
  // Like the store, a record has the IDs through the count, or all of them at the channel's end.
  const getChannel = jest.fn((
    name: string,
    args: object,
    context: object,
    count: number,
  ) => (loading.includes(name) ? null : {
    entity_kind: 'postType',
    has_more: ids.length > count,
    ids: ids.slice(0, count),
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
        {
          arg_fields: [],
          is_available: true,
          is_default: true,
          label: 'Global',
          name: 'global_default',
          uses_context: [],
        },
        {
          arg_fields: [],
          is_available: true,
          is_default: false,
          label: 'Post default',
          name: 'post_default',
          uses_context: [],
        },
        {
          arg_fields: [{
            id: 'term', label: 'Category', required: true,
          }],
          is_available: true,
          is_default: false,
          label: 'In category',
          name: IN_CATEGORY,
          uses_context: [],
        },
        {
          arg_fields: [],
          is_available: true,
          is_default: false,
          label: 'In issue',
          name: IN_ISSUE,
          uses_context: ['postId'],
        },
      ],
    };

    if (storeName === 'core/block-editor') {
      selectors = {
        getBlocks: () => blocks,
        getSettings: () => ({}),
      };
    }

    // Only Channel Loop gives its channel to the blocks inside it.
    if (storeName === 'core/blocks') {
      selectors = {
        getBlockType: (name: string) => ({
          providesContext: name === 'wp-curate/channel-loop' ? { 'wp-curate/channel': 'channel' } : {},
          supports: { 'wp-curate/channel': true },
        }),
      };
    }

    if (storeName === 'core/editor') {
      selectors = {
        getCurrentPostId: () => POST_ID,
        getCurrentPostType: () => 'post',
        getEditedPostAttribute: () => ({ ...meta, wp_curate_default_channel: defaultChannel }),
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
function singleBlock(clientId: string, channel = 'post_latest') {
  return {
    attributes: {
      channel: { name: channel },
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
      expect(args).toEqual(['post_latest', {}, {}, 10]);
    });
  });

  it('asks for the next page when the blocks need more IDs than the first page has', () => {
    const blocks = Array.from({ length: 11 }, (_, index) => singleBlock(String(index)));
    const {
      getChannel,
      select,
    } = fakeSelect(blocks, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

    expect(channelQueueIds(select, '10')).toEqual([11]);
    expect(getChannel).toHaveBeenCalledWith('post_latest', {}, {}, 20);
  });

  it('gives a Channel Loop channel to the blocks without one inside it, in document order', () => {
    const blocks = [
      singleBlock('before'),
      parentBlock('wp-curate/channel-loop', { channel: { name: 'post_latest' } }, [
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

  it('gives a Channel Loop channel to a block inside it that has its own, and keeps its pin', () => {
    const blocks = [
      parentBlock('wp-curate/channel-loop', { channel: { name: 'page_latest' } }, [
        singleBlock('moved'),
        { ...singleBlock('pinned'), attributes: { channel: { name: 'post_latest' }, ref: 99 } },
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
    expect(getChannel).not.toHaveBeenCalledWith('post_latest', {}, {}, 10);
  });

  it('gives no channel to the blocks inside a Channel Loop block that has none', () => {
    const blocks = [
      parentBlock('wp-curate/channel-loop', { channel: { name: 'outer' } }, [
        parentBlock('wp-curate/channel-loop', { channel: { name: '' } }, [singleBlock('inner', '')]),
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
    expect(getChannel).toHaveBeenCalledWith('post_default', {}, {}, 10);
  });

  it('gives the global default channel to a block when the post has no default', () => {
    const {
      getChannel,
      select,
    } = fakeSelect([singleBlock('alone', '')], [11]);

    expect(channelQueueIds(select, 'alone')).toEqual([11]);
    expect(getChannel).toHaveBeenCalledWith('global_default', {}, {}, 10);
  });

  it('makes only the blocks in a loading channel wait', () => {
    const blocks = [
      singleBlock('first'),
      singleBlock('switched', 'page_latest'),
      singleBlock('second'),
      singleBlock('after', 'page_latest'),
    ];
    const {
      select,
    } = fakeSelect(blocks, [11, 12, 13], '', ['page_latest']);

    expect(channelQueueIds(select, 'first')).toEqual([11]);
    expect(channelQueueIds(select, 'switched')).toBeNull();
    expect(channelQueueIds(select, 'second')).toEqual([12]);
    expect(channelQueueIds(select, 'after')).toBeNull();
  });

  it('makes the blocks inside a loading block wait, without requesting their channel', () => {
    const blocks = [
      parentBlock('wp-curate/single-post', { channel: { name: 'page_latest' }, ref: 0 }, [
        singleBlock('inside', 'post_latest'),
      ]),
    ];
    const {
      getChannel,
      select,
    } = fakeSelect(blocks, [11], '', ['page_latest']);

    expect(channelQueueIds(select, 'inside')).toBeNull();
    expect(getChannel).not.toHaveBeenCalledWith(
      'post_latest',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('keeps a separate queue for each set of arguments, and sends them to the channel', () => {
    const blocks = [
      { ...singleBlock('five'), attributes: { channel: { args: { term: 5 }, name: IN_CATEGORY }, ref: 0 } },
      { ...singleBlock('six'), attributes: { channel: { args: { term: 6 }, name: IN_CATEGORY }, ref: 0 } },
      { ...singleBlock('five_again'), attributes: { channel: { args: { term: 5 }, name: IN_CATEGORY }, ref: 0 } },
    ];
    const {
      getChannel,
      select,
    } = fakeSelect(blocks, [11, 12]);

    expect(channelQueueIds(select, 'five')).toEqual([11]);
    expect(channelQueueIds(select, 'six')).toEqual([11]);
    expect(channelQueueIds(select, 'five_again')).toEqual([12]);
    expect(getChannel).toHaveBeenCalledWith(IN_CATEGORY, { term: 5 }, {}, 10);
    expect(getChannel).toHaveBeenCalledWith(IN_CATEGORY, { term: 6 }, {}, 10);
  });

  it('takes nothing from a channel without each of its arguments, but keeps a pin', () => {
    const blocks = [
      singleBlock('none', IN_CATEGORY),
      { ...singleBlock('pinned'), attributes: { channel: { name: IN_CATEGORY }, ref: 99 } },
    ];
    const {
      getChannel,
      select,
    } = fakeSelect(blocks, [11]);

    expect(channelQueueIds(select, 'none')).toEqual([]);
    expect(channelQueueIds(select, 'pinned')).toEqual([99]);
    expect(getChannel).not.toHaveBeenCalled();
  });

  it('gives Channel Loop arguments to the blocks inside it, even if they have their own', () => {
    const blocks = [
      parentBlock('wp-curate/channel-loop', { channel: { args: { term: 5 }, name: IN_CATEGORY } }, [
        singleBlock('first', ''),
        { ...singleBlock('moved'), attributes: { channel: { args: { term: 6 }, name: IN_CATEGORY }, ref: 0 } },
      ]),
    ];
    const {
      getChannel,
      select,
    } = fakeSelect(blocks, [11, 12]);

    expect(channelQueueIds(select, 'first')).toEqual([11]);
    expect(channelQueueIds(select, 'moved')).toEqual([12]);
    expect(getChannel).not.toHaveBeenCalledWith(IN_CATEGORY, { term: 6 }, {}, expect.anything());
  });

  it('sends only the arguments that the channel reads', () => {
    const blocks = [
      { ...singleBlock('stale'), attributes: { channel: { args: { term: 5 }, name: 'post_latest' }, ref: 0 } },
    ];
    const {
      getChannel,
      select,
    } = fakeSelect(blocks, [11]);

    expect(channelQueueIds(select, 'stale')).toEqual([11]);
    expect(getChannel).toHaveBeenCalledWith('post_latest', {}, {}, 10);
  });

  it('sends a channel the post as context at the top of the post', () => {
    const {
      getChannel,
      select,
    } = fakeSelect([singleBlock('top', IN_ISSUE)], [11]);

    expect(channelQueueIds(select, 'top')).toEqual([11]);
    expect(getChannel).toHaveBeenCalledWith(IN_ISSUE, {}, { postId: POST_ID }, 10);
  });

  it('sends a channel the post of the Single Post around it, with a queue for each post', () => {
    /**
     * A Single Post of the latest post that holds a Channel Loop block of the articles in it.
     *
     * @param clientId Client ID of the Single Post.
     * @param ref      The pinned post.
     */
    const issueBlock = (clientId: string, ref: number) => ({
      attributes: { channel: { name: 'post_latest' }, postType: 'magazine_issue', ref },
      clientId,
      innerBlocks: [
        parentBlock('wp-curate/channel-loop', { channel: { name: IN_ISSUE } }, [
          singleBlock(`${clientId}-article`, ''),
        ]),
      ],
      name: 'wp-curate/single-post',
    });

    const {
      getChannel,
      select,
    } = fakeSelect([issueBlock('first', 0), issueBlock('second', 30)], [11, 12]);

    expect(channelQueueIds(select, 'first-article')).toEqual([11]);
    expect(channelQueueIds(select, 'second-article')).toEqual([11]);
    expect(getChannel).toHaveBeenCalledWith(IN_ISSUE, {}, { postId: 11 }, 10);
    expect(getChannel).toHaveBeenCalledWith(IN_ISSUE, {}, { postId: 30 }, 10);
    expect(getChannel).not.toHaveBeenCalledWith('post_latest', {}, { postId: POST_ID }, 10);
    expect(channelQueueContext(select, 'first-article')).toEqual({
      postId: 11,
      postType: 'magazine_issue',
    });
    expect(channelQueueContext(select, 'second-article')).toEqual({
      postId: 30,
      postType: 'magazine_issue',
    });
  });

  it('gives a block at the top of the post the post as its context', () => {
    const {
      select,
    } = fakeSelect([singleBlock('top')], [11]);

    expect(channelQueueContext(select, 'top')).toEqual({ postId: POST_ID, postType: 'post' });
  });

  it('has no context for a block while the block that gives it its context loads', () => {
    const blocks = [
      {
        ...singleBlock('outer', 'loading'),
        innerBlocks: [singleBlock('inner')],
      },
    ];
    const {
      select,
    } = fakeSelect(blocks, [11], '', ['loading']);

    expect(channelQueueContext(select, 'inner')).toBeNull();
  });
});

describe('channelQueueIds with post-level deduplication', () => {
  const DEDUPLICATION = { wp_curate_deduplication: true };
  const UNIQUE_PINNED = { wp_curate_deduplication: true, wp_curate_unique_pinned_posts: true };

  it('lets blocks in different channels show the same post without it', () => {
    const {
      select,
    } = fakeSelect([singleBlock('a'), singleBlock('b', 'post_default')], [11, 12]);

    expect(channelQueueIds(select, 'b')).toEqual([11]);
  });

  it('skips the posts that blocks before it took from any channel', () => {
    const {
      select,
    } = fakeSelect([singleBlock('a'), singleBlock('b', 'post_default')], [11, 12], '', [], DEDUPLICATION);

    expect(channelQueueIds(select, 'a')).toEqual([11]);
    expect(channelQueueIds(select, 'b')).toEqual([12]);
  });

  it('always shows a pin, even one that a block before it took', () => {
    const blocks = [
      singleBlock('a'),
      { ...singleBlock('b', 'post_default'), attributes: { channel: { name: 'post_default' }, ref: 11 } },
    ];
    const {
      select,
    } = fakeSelect(blocks, [11, 12], '', [], DEDUPLICATION);

    expect(channelQueueIds(select, 'b')).toEqual([11]);
  });

  it('skips a post that a block after it pins only with unique pinned posts', () => {
    const blocks = [
      singleBlock('a'),
      { ...singleBlock('b', 'post_default'), attributes: { channel: { name: 'post_default' }, ref: 11 } },
    ];

    expect(channelQueueIds(fakeSelect(blocks, [11, 12], '', [], DEDUPLICATION).select, 'a')).toEqual([11]);
    expect(channelQueueIds(fakeSelect(blocks, [11, 12], '', [], UNIQUE_PINNED).select, 'a')).toEqual([12]);
  });

  it('ignores unique pinned posts without deduplication', () => {
    const blocks = [
      singleBlock('a'),
      { ...singleBlock('b', 'post_default'), attributes: { channel: { name: 'post_default' }, ref: 11 } },
    ];
    const {
      select,
    } = fakeSelect(blocks, [11, 12], '', [], { wp_curate_unique_pinned_posts: true });

    expect(channelQueueIds(select, 'a')).toEqual([11]);
  });

  it('loads the next page when every loaded post is skipped', () => {
    const ids = Array.from({ length: 15 }, (_, index) => index + 1);
    const blocks = [
      ...Array.from({ length: 10 }, (_, index) => singleBlock(`a${index}`)),
      singleBlock('b', 'post_default'),
    ];
    const {
      getChannel,
      select,
    } = fakeSelect(blocks, ids, '', [], DEDUPLICATION);

    expect(channelQueueIds(select, 'b')).toEqual([11]);
    expect(getChannel).toHaveBeenCalledWith('post_default', {}, {}, 20);
  });

  it('makes a block wait for a loading block before it in another channel', () => {
    const blocks = [singleBlock('a', 'loading'), singleBlock('b')];

    expect(channelQueueIds(fakeSelect(blocks, [11], '', ['loading']).select, 'b')).toEqual([11]);
    expect(channelQueueIds(fakeSelect(blocks, [11], '', ['loading'], DEDUPLICATION).select, 'b')).toBeNull();
  });
});
