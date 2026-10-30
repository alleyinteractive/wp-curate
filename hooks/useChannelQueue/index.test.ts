// Internal dependencies.
import { channelQueueContext, channelQueuePost } from './index';

jest.mock('@wordpress/block-editor', () => ({
  store: 'core/block-editor',
}));

jest.mock('@wordpress/blocks', () => ({
  store: 'core/blocks',
}));

jest.mock('@wordpress/data', () => ({
  useSelect: jest.fn(),
}));

// A channel of the posts in a term, which accepts a `term` argument.
const IN_CATEGORY = 'post_category_latest';

// A channel of the articles in an issue, which reads the `postId` context.
const IN_ISSUE = 'articles_in_issue';

// The post in the editor.
const POST_ID = 5;

/**
 * A `select` function with the given blocks and channel results with the given IDs.
 *
 * @param blocks   Blocks in the editor.
 * @param ids      IDs in every channel.
 * @param loading  Channels that have not loaded.
 * @param postType The type of every post in the channel results.
 * @param controlled Controlled inner blocks, keyed by the client ID of the block that has them.
 */
function fakeSelect(
  blocks: object[],
  ids: number[],
  loading: string[] = [],
  postType = 'post',
  controlled: Record<string, object[]> = {},
) {
  /**
   * Like the store, the inner blocks of a block, or the top-level blocks without a client ID. The
   * store keeps controlled inner blocks apart from the block's `innerBlocks`.
   *
   * @param rootClientId Client ID of the block.
   */
  const getBlocks = (rootClientId = ''): object[] => {
    let out: object[] = [];

    if (rootClientId === '') {
      out = blocks;
    } else if (rootClientId in controlled) {
      out = controlled[rootClientId];
    } else {
      const find = (list: any[]): any => {
        let found: any;

        list.forEach((block) => {
          if (found === undefined && block.clientId === rootClientId) {
            found = block;
          }

          if (found === undefined) {
            found = find(block.innerBlocks);
          }
        });

        return found;
      };

      const block = find(blocks);

      if (block !== undefined) {
        out = block.innerBlocks;
      }
    }

    return out;
  };

  // Like the store, the results have the IDs through the count, or all of them at the channel's
  // end.
  const getChannelResults = jest.fn((
    name: string,
    args: object,
    context: object,
    count: number,
  ) => (loading.includes(name) ? null : {
    entity_kind: 'postType',
    has_more: ids.length > count,
    ids: ids.slice(0, count),
    label: 'Test',
    post_types: {},
    uses_context: [],
  }));

  const select = jest.fn((storeName: string) => {
    let selectors: object = {
      getChannelResults,
      getTypeOfPostInChannel: () => postType,
      getAvailableChannels: () => [
        {
          args: {},
          eligible: true,
          default: true,
          label: 'Global',
          name: 'global_default',
          uses_context: [],
        },
        {
          args: {},
          eligible: true,
          default: false,
          label: 'Other',
          name: 'other',
          uses_context: [],
        },
        {
          args: {
            term: { label: 'Category', required: true },
          },
          eligible: true,
          default: false,
          label: 'In category',
          name: IN_CATEGORY,
          uses_context: [],
        },
        {
          args: {},
          eligible: true,
          default: false,
          label: 'In issue',
          name: IN_ISSUE,
          uses_context: ['postId'],
        },
      ],
    };

    if (storeName === 'core/block-editor') {
      selectors = {
        getBlocks,
        getSettings: () => ({}),
      };
    }

    // Only Channel gives its channel to the blocks inside it. Channel Loop has no channel.
    if (storeName === 'core/blocks') {
      selectors = {
        getBlockType: (name: string) => ({
          providesContext: name === 'wp-curate/channel-content' ? { 'wp-curate/channel': 'channel' } : {},
          supports: { 'wp-curate/channels': name !== 'wp-curate/channel-loop' },
        }),
      };
    }

    if (storeName === 'core/editor') {
      selectors = {
        getCurrentPostId: () => POST_ID,
        getCurrentPostType: () => 'post',
      };
    }

    return selectors;
  });

  return {
    getChannelResults,
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

// The number of blocks that `parentBlock()` has made, for their client IDs.
let parentCount = 0;

/**
 * A block that holds other blocks.
 *
 * @param name        Block name.
 * @param attributes  Block attributes.
 * @param innerBlocks Inner blocks.
 */
function parentBlock(name: string, attributes: object, innerBlocks: object[]) {
  parentCount += 1;

  return {
    attributes,
    // Unique, like in the store, so that `getBlocks()` finds this block's inner blocks.
    clientId: `${name}-${parentCount}`,
    innerBlocks,
    name,
  };
}

/**
 * The ID of the post that a block takes, 0 if it takes none, or null while channels load.
 *
 * @param select   The data registry's `select`.
 * @param clientId Client ID of the block.
 */
function takenId(select: any, clientId: string): number | null {
  const post = channelQueuePost(select, clientId);

  let id: number | null = null;

  if (post !== null) {
    id = post.postId;
  }

  return id;
}

describe('channelQueuePost IDs', () => {
  it('passes every argument to getChannelResults, so that calls for the same IDs share a request', () => {
    const {
      getChannelResults,
      select,
    } = fakeSelect([singleBlock('a'), singleBlock('b')], [11, 12, 13]);

    expect(takenId(select, 'b')).toBe(12);
    expect(getChannelResults.mock.calls.length).toBeGreaterThan(0);

    getChannelResults.mock.calls.forEach((args: unknown[]) => {
      expect(args).toEqual(['post_latest', {}, {}, 10]);
    });
  });

  it('asks for the next page when the blocks need more IDs than the first page has', () => {
    const blocks = Array.from({ length: 11 }, (_, index) => singleBlock(String(index)));
    const {
      getChannelResults,
      select,
    } = fakeSelect(blocks, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

    expect(takenId(select, '10')).toBe(11);
    expect(getChannelResults).toHaveBeenCalledWith('post_latest', {}, {}, 20);
  });

  it('gives a Channel Content block channel to the blocks without one inside it, in document order', () => {
    const blocks = [
      singleBlock('before'),
      parentBlock('wp-curate/channel-content', { channel: { name: 'post_latest' } }, [
        singleBlock('first', ''),
        parentBlock('core/group', {}, [singleBlock('nested', '')]),
      ]),
      singleBlock('after'),
    ];
    const {
      select,
    } = fakeSelect(blocks, [11, 12, 13, 14]);

    expect(takenId(select, 'first')).toBe(12);
    expect(takenId(select, 'nested')).toBe(13);
    expect(takenId(select, 'after')).toBe(14);
  });

  it('gives a Channel Content block channel to a block inside it that has its own, and keeps its pin', () => {
    const blocks = [
      parentBlock('wp-curate/channel-content', { channel: { name: 'page_latest' } }, [
        singleBlock('moved'),
        { ...singleBlock('pinned'), attributes: { channel: { name: 'post_latest' }, ref: 99 } },
        singleBlock('last', ''),
      ]),
    ];
    const {
      getChannelResults,
      select,
    } = fakeSelect(blocks, [11, 99, 12]);

    expect(takenId(select, 'moved')).toBe(11);
    expect(takenId(select, 'pinned')).toBe(99);
    expect(takenId(select, 'last')).toBe(99);
    expect(getChannelResults).not.toHaveBeenCalledWith('post_latest', {}, {}, 10);
  });

  it('gives no channel to the blocks inside a Channel Content block that has none', () => {
    const blocks = [
      parentBlock('wp-curate/channel-content', { channel: { name: 'outer' } }, [
        parentBlock('wp-curate/channel-content', { channel: { name: '' } }, [singleBlock('inner', '')]),
      ]),
    ];
    const {
      getChannelResults,
      select,
    } = fakeSelect(blocks, [11]);

    expect(takenId(select, 'inner')).toBe(0);
    expect(getChannelResults).not.toHaveBeenCalled();
  });

  it('gives the default channel to a block without a channel or an ancestor with one', () => {
    const {
      getChannelResults,
      select,
    } = fakeSelect([singleBlock('alone', '')], [11]);

    expect(takenId(select, 'alone')).toBe(11);
    expect(getChannelResults).toHaveBeenCalledWith('global_default', {}, {}, 10);
  });

  it('makes only the blocks in a loading channel wait', () => {
    const blocks = [
      singleBlock('first'),
      singleBlock('switched', 'page_latest'),
      singleBlock('second'),
    ];
    const {
      select,
    } = fakeSelect(blocks, [11, 12, 13], ['page_latest']);

    expect(takenId(select, 'first')).toBe(11);
    expect(takenId(select, 'switched')).toBeNull();
    expect(takenId(select, 'second')).toBe(12);
  });

  it('makes the blocks inside a loading block wait, without requesting their channel', () => {
    const blocks = [
      parentBlock('wp-curate/single-post', { channel: { name: 'page_latest' }, ref: 0 }, [
        singleBlock('inside', 'post_latest'),
      ]),
    ];
    const {
      getChannelResults,
      select,
    } = fakeSelect(blocks, [11], ['page_latest']);

    expect(takenId(select, 'inside')).toBeNull();
    expect(getChannelResults).not.toHaveBeenCalledWith(
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
      getChannelResults,
      select,
    } = fakeSelect(blocks, [11, 12, 13]);

    expect(takenId(select, 'five')).toBe(11);
    expect(takenId(select, 'six')).toBe(11);
    expect(takenId(select, 'five_again')).toBe(12);
    expect(getChannelResults).toHaveBeenCalledWith(IN_CATEGORY, { term: 5 }, {}, 10);
    expect(getChannelResults).toHaveBeenCalledWith(IN_CATEGORY, { term: 6 }, {}, 10);
  });

  it('takes nothing from a channel without each of its arguments, but keeps a pin', () => {
    const blocks = [
      singleBlock('none', IN_CATEGORY),
      { ...singleBlock('pinned'), attributes: { channel: { name: IN_CATEGORY }, ref: 99 } },
    ];
    const {
      getChannelResults,
      select,
    } = fakeSelect(blocks, [11]);

    expect(takenId(select, 'none')).toBe(0);
    expect(takenId(select, 'pinned')).toBe(99);
    expect(getChannelResults).not.toHaveBeenCalled();
  });

  it('gives Channel Content block arguments to the blocks inside it, even if they have their own', () => {
    const blocks = [
      parentBlock('wp-curate/channel-content', { channel: { args: { term: 5 }, name: IN_CATEGORY } }, [
        singleBlock('first', ''),
        { ...singleBlock('moved'), attributes: { channel: { args: { term: 6 }, name: IN_CATEGORY }, ref: 0 } },
      ]),
    ];
    const {
      getChannelResults,
      select,
    } = fakeSelect(blocks, [11, 12]);

    expect(takenId(select, 'first')).toBe(11);
    expect(takenId(select, 'moved')).toBe(12);
    expect(getChannelResults).not.toHaveBeenCalledWith(
      IN_CATEGORY,
      { term: 6 },
      {},
      expect.anything(),
    );
  });

  it('sends only the arguments that the channel accepts', () => {
    const blocks = [
      { ...singleBlock('stale'), attributes: { channel: { args: { term: 5 }, name: 'post_latest' }, ref: 0 } },
    ];
    const {
      getChannelResults,
      select,
    } = fakeSelect(blocks, [11]);

    expect(takenId(select, 'stale')).toBe(11);
    expect(getChannelResults).toHaveBeenCalledWith('post_latest', {}, {}, 10);
  });

  it('sends a channel the post as context at the top of the post', () => {
    const {
      getChannelResults,
      select,
    } = fakeSelect([singleBlock('top', IN_ISSUE)], [11]);

    expect(takenId(select, 'top')).toBe(11);
    expect(getChannelResults).toHaveBeenCalledWith(IN_ISSUE, {}, { postId: POST_ID }, 10);
  });

  it('sends a channel the post of the Single Post around it, with a queue for each post', () => {
    /**
     * A Single Post of the latest post that holds a Channel Content block of the articles in it.
     *
     * @param clientId Client ID of the Single Post.
     * @param ref      The pinned post.
     */
    const issueBlock = (clientId: string, ref: number) => ({
      attributes: { channel: { name: 'post_latest' }, postType: ref > 0 ? 'magazine_issue' : '', ref },
      clientId,
      innerBlocks: [
        parentBlock('wp-curate/channel-content', { channel: { name: IN_ISSUE } }, [
          singleBlock(`${clientId}-article`, ''),
        ]),
      ],
      name: 'wp-curate/single-post',
    });

    const {
      getChannelResults,
      select,
    } = fakeSelect([issueBlock('first', 0), issueBlock('second', 30)], [11, 12, 13], [], 'magazine_issue');

    // Each issue's articles are a separate queue, which starts at the top.
    expect(takenId(select, 'first-article')).toBe(11);
    expect(takenId(select, 'second-article')).toBe(11);
    expect(getChannelResults).toHaveBeenCalledWith(IN_ISSUE, {}, { postId: 11 }, 10);
    expect(getChannelResults).toHaveBeenCalledWith(IN_ISSUE, {}, { postId: 30 }, 10);
    expect(getChannelResults).not.toHaveBeenCalledWith('post_latest', {}, { postId: POST_ID }, 10);
    expect(channelQueueContext(select, 'first-article')).toEqual({
      postId: 11,
      postType: 'magazine_issue',
    });
    expect(channelQueueContext(select, 'second-article')).toEqual({
      postId: 30,
      postType: 'magazine_issue',
    });
  });

  it('gives a Channel Content block channel to a Single Post and to a Channel Loop beside it, in order', () => {
    const blocks = [
      parentBlock('wp-curate/channel-content', { channel: { name: 'page_latest' } }, [
        singleBlock('featured', ''),
        parentBlock('wp-curate/channel-loop', {}, [
          singleBlock('second', ''),
          singleBlock('third', ''),
        ]),
      ]),
    ];
    const {
      getChannelResults,
      select,
    } = fakeSelect(blocks, [11, 12, 13]);

    expect(takenId(select, 'featured')).toBe(11);
    expect(takenId(select, 'second')).toBe(12);
    expect(takenId(select, 'third')).toBe(13);
    expect(getChannelResults).not.toHaveBeenCalledWith('post_latest', {}, {}, 10);
  });

  it('gives the blocks inside a Channel Content block inside another one the inner channel', () => {
    const blocks = [
      parentBlock('wp-curate/channel-content', { channel: { name: 'post_latest' } }, [
        parentBlock('wp-curate/channel-content', { channel: { name: 'page_latest' } }, [
          singleBlock('inner', ''),
        ]),
      ]),
    ];
    const {
      getChannelResults,
      select,
    } = fakeSelect(blocks, [11]);

    expect(takenId(select, 'inner')).toBe(11);
    expect(getChannelResults).toHaveBeenCalledWith('page_latest', {}, {}, 10);
    expect(getChannelResults).not.toHaveBeenCalledWith('post_latest', {}, {}, 10);
  });

  it('lets the blocks in a Channel Loop outside a Channel Content block use their own channels', () => {
    const blocks = [
      parentBlock('wp-curate/channel-loop', {}, [singleBlock('own', 'page_latest')]),
    ];
    const {
      getChannelResults,
      select,
    } = fakeSelect(blocks, [11]);

    expect(takenId(select, 'own')).toBe(11);
    expect(getChannelResults).toHaveBeenCalledWith('page_latest', {}, {}, 10);
  });

  it('reaches the controlled inner blocks of a block, like Post Content in a template', () => {
    const blocks = [
      singleBlock('in-template'),
      {
        attributes: {},
        clientId: 'post-content',
        innerBlocks: [],
        name: 'core/post-content',
      },
    ];
    const {
      select,
    } = fakeSelect(blocks, [11, 12], [], 'post', {
      'post-content': [singleBlock('in-post')],
    });

    expect(takenId(select, 'in-template')).toBe(11);
    expect(takenId(select, 'in-post')).toBe(12);
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
    } = fakeSelect(blocks, [11], ['loading']);

    expect(channelQueueContext(select, 'inner')).toBeNull();
  });
});

describe('channelQueuePost', () => {
  it('gives the top of the queue with its type from the channel results', () => {
    const {
      select,
    } = fakeSelect([singleBlock('top')], [11], [], 'magazine_issue');

    expect(channelQueuePost(select, 'top')).toEqual({ postId: 11, postType: 'magazine_issue' });
  });

  it('gives a pin with the type that the block saved', () => {
    const blocks = [
      { ...singleBlock('pinned'), attributes: { channel: { name: 'post_latest' }, postType: 'page', ref: 99 } },
    ];
    const {
      select,
    } = fakeSelect(blocks, [11]);

    expect(channelQueuePost(select, 'pinned')).toEqual({ postId: 99, postType: 'page' });
  });

  it('gives no post when the channel has no posts left', () => {
    const {
      select,
    } = fakeSelect([singleBlock('first'), singleBlock('second')], [11]);

    expect(channelQueuePost(select, 'second')).toEqual({ postId: 0, postType: '' });
  });

  it('gives null while the channel loads', () => {
    const {
      select,
    } = fakeSelect([singleBlock('waiting', 'loading')], [11], ['loading']);

    expect(channelQueuePost(select, 'waiting')).toBeNull();
  });

  it('gives no post as the context of the blocks inside a block without a post', () => {
    const blocks = [
      {
        ...singleBlock('empty', IN_CATEGORY),
        innerBlocks: [singleBlock('inner')],
      },
    ];
    const {
      select,
    } = fakeSelect(blocks, [11]);

    expect(channelQueueContext(select, 'inner')).toEqual({ postId: 0, postType: '' });
  });
});

describe('channelQueuePost queues', () => {
  it('does not skip the posts that blocks took from other channels', () => {
    const {
      select,
    } = fakeSelect([singleBlock('a'), singleBlock('b', 'other')], [11, 12]);

    expect(takenId(select, 'a')).toBe(11);
    expect(takenId(select, 'b')).toBe(11);
  });

  it('shows a pin and leaves the queue as it is, even when the pin is in the queue', () => {
    const blocks = [
      { ...singleBlock('pinned'), attributes: { channel: { name: 'post_latest' }, ref: 11 } },
      singleBlock('a'),
      singleBlock('b'),
    ];
    const {
      select,
    } = fakeSelect(blocks, [11, 12]);

    expect(takenId(select, 'pinned')).toBe(11);
    expect(takenId(select, 'a')).toBe(11);
    expect(takenId(select, 'b')).toBe(12);
  });

  it('does not request the channel of a pinned block', () => {
    const blocks = [
      { ...singleBlock('pinned'), attributes: { channel: { name: 'post_latest' }, ref: 11 } },
    ];
    const {
      getChannelResults,
      select,
    } = fakeSelect(blocks, [11]);

    expect(takenId(select, 'pinned')).toBe(11);
    expect(getChannelResults).not.toHaveBeenCalled();
  });
});
