// WordPress dependencies.
import { store as blockEditorStore } from '@wordpress/block-editor';
import { store as blocksStore } from '@wordpress/blocks';
import { useSelect } from '@wordpress/data';
import { useMemo } from '@wordpress/element';

// Plugin dependencies.
import {
  CHANNEL_CONTEXT,
  type ChannelPostToTake,
  channelArgFields,
  channelContext,
  channelInnerContexts,
  channelPostsToTake,
  hasChannelPostsToTake,
  hasChannelSupport,
  hasEveryChannelArg,
  isChannelProvider,
  pickChannelArgs,
  toBlockChannel,
  toBlockChannelArgs,
  toChannelName,
} from '../useBlockChannel';
import { CHANNEL_PAGE_SIZE, type ChannelResults } from '../useChannelResults';

const NO_IDS: number[] = [];

/**
 * A post that a block takes from its channel.
 */
export interface ChannelQueuePost {
  /** Post ID. */
  postId: number;
  /** Post type. */
  postType: string;
}

const NO_POST: ChannelQueuePost = {
  postId: 0,
  postType: '',
};

/**
 * Each post that a block takes, in order. An entry is null when the queue has no post for it.
 */
export type ChannelBlockPosts = (ChannelQueuePost | null)[];

const NO_POSTS: ChannelBlockPosts = [];

/**
 * The context that tells the block its channel and the data the block takes from the channel.
 */
interface ChannelQueue {
  /** The context, or null while the block above it that gives it its context loads. */
  context: Record<string, unknown> | null;
  /** Each post that the block takes, or null while channels load. See `channelPostsToTake()`. */
  posts: ChannelBlockPosts | null;
}

/**
 * The `channel` attribute of a block, or undefined if it has none.
 *
 * @param block Block.
 */
function channelAttribute(block: unknown): unknown {
  let channel: unknown;

  if (typeof block !== 'object' || block === null) {
    return channel;
  }

  const {
    attributes,
  } = block as Record<string, unknown>;

  if (typeof attributes === 'object' && attributes !== null) {
    ({ channel } = attributes as Record<string, unknown>);
  }

  return channel;
}

/**
 * The pins of a block, with null for each post without a pin.
 *
 * @param toTake Each post that the block takes.
 */
function pinnedPosts(toTake: ChannelPostToTake[]): ChannelBlockPosts {
  return toTake.map(({ postType, ref }) => {
    let post: ChannelQueuePost | null = null;

    if (ref > 0) {
      post = {
        postId: ref,
        postType,
      };
    }

    return post;
  });
}

/**
 * Get the context of the blocks at the top of the post, which is the post itself, the way that
 * `render_block()` gives it in PHP.
 *
 * @param select The data registry's `select`.
 */
function postContext(select: any): Record<string, unknown> {
  // An editor without a post, such as the widgets editor, has no editor store.
  const editor = select('core/editor');

  let context: Record<string, unknown> = {};

  if (typeof editor !== 'object' || editor === null) {
    return context;
  }

  const {
    getCurrentPostId,
    getCurrentPostType,
  } = editor;

  const postId = getCurrentPostId();
  const postType = getCurrentPostType();

  if (Number.isInteger(postId) && postId > 0 && typeof postType === 'string') {
    context = {
      postId,
      postType,
    };
  }

  /*
   * A template or template part in the site editor has a string ID, and no post to give. Give only
   * its post type, so that a channel can choose a sample post for the preview.
   */
  if (postType === 'wp_template' || postType === 'wp_template_part') {
    context = {
      postType,
    };
  }

  return context;
}

/**
 * Give a context the channel of the provider around a block, as `wp-curate/channel`, or no channel
 * if no provider is around the block. A provider sets the channel of every block inside it, at any
 * depth, until another provider. So a block that takes posts does not decide the channel of the
 * blocks inside it, even if its `channelInnerContext` callback leaves out the key or sets it. In
 * PHP, `Post_Template` gives its inner blocks the same channel.
 *
 * @param context      The context around the block.
 * @param childContext A context of the blocks inside it.
 */
function withChannelOf(
  context: Record<string, unknown>,
  childContext: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...childContext };

  delete out[CHANNEL_CONTEXT];

  if (CHANNEL_CONTEXT in context) {
    out[CHANNEL_CONTEXT] = context[CHANNEL_CONTEXT];
  }

  return out;
}

/**
 * Get the posts that a block with a channel takes, given the blocks before it in the editor, and
 * the context that the block gives its channel.
 *
 * Keep the rules in sync with `Queues` in PHP. Blocks take IDs in document order:
 *
 * - A block type with a `channelPostsToTake` callback, like Single Post and Channel Loop, takes an
 *   ID for each post that the callback returns, in order. A pin takes its ref. A post without a pin
 *   takes the top of the channel's queue. Each ID is then removed from the queue. See
 *   `channelPostsToTake()`. A block without a channel takes nothing. Then its inner blocks render
 *   once for each post that its `channelInnerContext` callback gives a context for. See
 *   `channelInnerContexts()`. Each of those contexts keeps the channel of the provider around the
 *   block. See `withChannelOf()`.
 * - Any other block, such as Channel Content, takes nothing. Its inner blocks render once with its
 *   context. A provider adds its channel to that context as `wp-curate/channel`.
 *
 * A block uses the channel that `toBlockChannel()` describes. Inside a provider, a block has the
 * provider's channel, so it has none if the provider has none. Outside a provider, it has its own
 * channel. A channel has a separate queue for each set of arguments that it accepts and context
 * that it reads, and has no posts until the block gives it each argument. The blocks at the top of
 * the post have the post as context.
 *
 * A block takes all of its posts before its inner blocks take any, on the page as in the walk. So
 * inside a provider, a block in the template of a Channel Loop gets no posts from the provider's
 * channel, because the Channel Loop took all of them.
 *
 * The blocks that use the same queue never show the same post twice. The queues do not share IDs,
 * so blocks that use different queues can show the same post. In the editor, a block always shows
 * its own pin. A block waits only for the blocks before it in the same queue.
 *
 * @param select   The data registry's `select`.
 * @param clientId Client ID of the block.
 */
function channelQueue(
  select: any,
  clientId: string,
): ChannelQueue {
  const {
    getBlocks,
  } = select(blockEditorStore);

  const {
    getBlockType,
  } = select(blocksStore);

  const {
    getAvailableChannels,
    getChannelResults,
    getTypeOfPostInChannel,
  } = select('wp-curate/channels') as any;

  // Every block reads the arguments and context of its channel, so all of them wait for the list.
  if (getAvailableChannels({}) === null) {
    return {
      context: null,
      posts: null,
    };
  }

  /*
   * The IDs taken so far from each queue, keyed by the channel and the arguments and context that
   * it uses.
   */
  const takenFromQueues = new Map<string, number[]>();

  /*
   * The channels that are loading for a block, with their arguments. The blocks after it in the
   * same channel with the same arguments cannot know their IDs until it loads, but the blocks in
   * others can.
   */
  const loadingChannels = new Set<string>();

  /*
   * A block inside a block that renders its inner blocks more than once is in the walk more than
   * once. The editor shows its first copy, so the first visit gives its context and posts.
   */
  let isOutFound = false;
  let isOutLoading = false;
  let outContext: Record<string, unknown> | null = null;
  let outPosts = NO_POSTS;

  // The number of blocks with channel support that the walk has visited.
  let channelBlockCount = 0;

  /*
   * Take the ID for each post that a block takes from its queue. The block is loading if its
   * channel is loading, or if the block above it that gives it its context is loading.
   *
   * A block inside a provider uses the provider's channel and arguments, even if the block has its
   * own from before it moved in.
   */
  const take = (
    block: any,
    context: Record<string, unknown>,
    toTake: ChannelPostToTake[],
    isContextLoading: boolean,
  ) => {
    const providerChannel = context[CHANNEL_CONTEXT];
    const providerName = toChannelName(providerChannel);

    // A pin shows while the queue loads, and also if the channel has no posts.
    const pinned = pinnedPosts(toTake);

    let isLoading = false;
    let name = toChannelName(channelAttribute(block));
    let posts = pinned;

    if (providerName !== null) {
      name = providerName;
    }

    // The walk does not call this for a block without a channel. Like that block, take nothing.
    if (name === null || name === '') {
      return {
        isLoading,
        posts: toTake.map(() => null),
      };
    }

    const fields = channelArgFields(select, name);
    const args = pickChannelArgs(
      fields,
      toBlockChannelArgs(channelAttribute(block), providerChannel),
    );
    const loadingKey = JSON.stringify([name, args]);

    // The channel has no posts until the block gives it each argument.
    if (!hasEveryChannelArg(fields, args)) {
      return {
        isLoading,
        posts,
      };
    }

    // Do not request a channel with context that is not known yet.
    if (isContextLoading || loadingChannels.has(loadingKey)) {
      loadingChannels.add(loadingKey);

      return {
        isLoading: true,
        posts,
      };
    }

    // Send and key the queue by only the context that the channel uses, like PHP does.
    const used = channelContext(select, name, context);
    const key = JSON.stringify([name, args, used]);

    let previous = NO_IDS;

    if (takenFromQueues.has(key)) {
      previous = takenFromQueues.get(key) as number[];
    }

    const unpinnedCount = toTake.filter(({ ref }) => ref === 0).length;

    // A block with only pins, or with no posts to take, needs no IDs from the channel.
    if (unpinnedCount === 0) {
      takenFromQueues.set(key, [...previous, ...toTake.map(({ ref }) => ref)]);

      return {
        isLoading,
        posts,
      };
    }

    /*
     * Every ID taken before can be in the queue, so load that many IDs plus one for each post
     * without a pin, in whole pages. Then load a page more each time that a post without a pin
     * finds every loaded ID removed, until the channel ends.
     */
    const needed = previous.length + unpinnedCount;
    let count = Math.ceil(needed / CHANNEL_PAGE_SIZE) * CHANNEL_PAGE_SIZE;
    let isSearching = true;

    while (isSearching) {
      const loaded: ChannelResults | null = getChannelResults(name, args, used, count);

      isSearching = false;

      if (loaded === null) {
        isLoading = true;
      }

      if (loaded !== null) {
        const {
          has_more: hasMore,
          ids,
        } = loaded;

        // The count of this request, for the loop below.
        const requested = count;

        // The IDs removed from the queue. The set grows each time that the block takes an ID.
        const skipped = new Set(previous);

        // The index of the first loaded ID that might not be removed. It only moves forward.
        let next = 0;
        let isShort = false;

        posts = toTake.map(({ postType, ref }) => {
          let post: ChannelQueuePost | null = null;

          // A pin is removed from the queue, so the block does not show it again.
          if (ref > 0) {
            skipped.add(ref);

            post = {
              postId: ref,
              postType: postType !== '' ? postType : getTypeOfPostInChannel(ref),
            };
          }

          while (ref === 0 && next < ids.length && skipped.has(ids[next])) {
            next += 1;
          }

          if (ref === 0 && next < ids.length) {
            skipped.add(ids[next]);

            post = {
              postId: ids[next],
              postType: getTypeOfPostInChannel(ids[next]),
            };
          }

          // The store gives results with fewer IDs than the count only at the channel's end.
          if (ref === 0 && post === null && hasMore && ids.length >= requested) {
            isShort = true;
          }

          return post;
        });

        if (isShort) {
          count += CHANNEL_PAGE_SIZE;
          isSearching = true;
        }
      }
    }

    if (!isLoading) {
      const taken = posts
        .filter((post): post is ChannelQueuePost => post !== null)
        .map(({ postId }) => postId);

      takenFromQueues.set(key, [...previous, ...taken]);
    }

    if (isLoading) {
      loadingChannels.add(loadingKey);
      posts = pinned;
    }

    return {
      isLoading,
      posts,
    };
  };

  /*
   * The loop that goes through the block tree in document order, taking IDs from each block's
   * channel queue. The walk "reaches" the clientId that was passed to this function and
   * records what IDs it took from its channel.
   */
  const walk = (
    blocks: any[],
    context: Record<string, unknown>,
    isContextLoading: boolean,
  ) => {
    blocks.forEach((block) => {
      const blockType = getBlockType(block.name);
      const isProvider = isChannelProvider(blockType);
      const takesPosts = hasChannelPostsToTake(blockType);
      const name = toChannelName(channelAttribute(block));
      const isOut = block.clientId === clientId && !isOutFound;

      // Like a block without channel support, a block without a channel takes nothing.
      const hasNoChannel = name !== null && toBlockChannel(name, context[CHANNEL_CONTEXT]) === '';

      let childContexts = [context];
      let isChildContextLoading = isContextLoading;

      if (hasChannelSupport(blockType)) {
        channelBlockCount += 1;
      }

      if (isOut) {
        isOutFound = true;
      }

      if (isOut && !isContextLoading) {
        outContext = context;
      }

      if (takesPosts && name !== null) {
        const toTake = channelPostsToTake(blockType, block.attributes, context);

        let isLoading = false;
        let posts: ChannelBlockPosts = toTake.map(() => null);

        if (!hasNoChannel) {
          ({
            isLoading,
            posts,
          } = take(block, context, toTake, isContextLoading));
        }

        if (isOut) {
          isOutLoading = isLoading;
          outPosts = posts;
        }

        /*
         * The block type says how its `render.php` renders the blocks inside it. Until the block's
         * posts are known, those blocks do not know their context, so they render once and wait.
         */
        if (isLoading) {
          isChildContextLoading = true;
        } else {
          childContexts = channelInnerContexts(blockType, block.attributes, context, posts)
            .map((childContext) => withChannelOf(context, childContext));
        }
      }

      // A provider gives its channel to the blocks inside it, as `providesContext` does.
      if (isProvider && name !== null) {
        childContexts = childContexts.map((childContext) => ({
          ...childContext,
          [CHANNEL_CONTEXT]: channelAttribute(block),
        }));
      }

      /*
       * Read the inner blocks from the store, not from `block.innerBlocks`. A block with
       * controlled inner blocks, like Post Content in "Show template" mode or a synced pattern,
       * keeps them only under its own client ID in the store.
       */
      const innerBlocks = getBlocks(block.clientId);
      const countBefore = channelBlockCount;

      childContexts.every((childContext) => {
        walk(innerBlocks, childContext, isChildContextLoading);

        /*
         * Without a channel block inside, each copy takes nothing, and the first copy already gave
         * any block inside its context. So skip the other copies, such as the other 99 copies of
         * a Channel Loop's template.
         */
        return channelBlockCount > countBefore;
      });
    });
  };

  walk(getBlocks(), postContext(select), false);

  let posts: ChannelBlockPosts | null = outPosts;

  if (isOutLoading) {
    posts = null;
  }

  return {
    context: outContext,
    posts,
  };
}

/**
 * A `channelInnerContext` callback that renders the inner blocks once for each post that the block
 * takes, with that post as their `postId` and `postType` context. Single Post and Channel Loop use
 * it. On the page, both render their inner blocks with `Post_Template`.
 *
 * Like on the page, the inner blocks do not get other context around the block. The walk adds the
 * channel of a Channel Content block around it. See `withChannelOf()`.
 *
 * @param attributes Block attributes.
 * @param context    The context around the block.
 * @param post       A post that the block takes.
 */
export function contextForPost(
  attributes: unknown,
  context: Record<string, unknown>,
  post: ChannelQueuePost,
): Record<string, unknown> {
  const {
    postId,
    postType,
  } = post;

  return {
    postId,
    postType,
  };
}

/**
 * Get the first post that a block takes, given the blocks before it in the editor, as the
 * `postId` and `postType` context that a Single Post gives the blocks inside it.
 *
 * This is a plain function of `select`, so that a label callback, which cannot call hooks, can use
 * it. `useChannelQueuePost()` wraps it for components.
 *
 * @param select   The data registry's `select`.
 * @param clientId Client ID of the block.
 * @return The post, no post if the queue had none or the block takes no posts, or null while
 *         channels load.
 */
export function channelQueuePost(select: any, clientId: string): ChannelQueuePost | null {
  const {
    posts,
  } = channelQueue(select, clientId);

  let post: ChannelQueuePost | null = null;

  if (posts !== null) {
    post = NO_POST;
  }

  if (posts !== null && posts.length > 0 && posts[0] !== null) {
    [post] = posts;
  }

  return post;
}

/**
 * Get each post that a block takes, given the blocks before it in the editor. See
 * `channelPostsToTake()`. The `getChannelPosts()` selector of the `wp-curate/channels` store gives
 * this to the blocks of other plugins.
 *
 * @param select   The data registry's `select`.
 * @param clientId Client ID of the block.
 * @return The posts, or null while channels load.
 */
export function channelQueuePosts(select: any, clientId: string): ChannelBlockPosts | null {
  return channelQueue(select, clientId).posts;
}

/**
 * Get the block context that a block gives its channel, such as the `postId` of the Single Post
 * around it. A picker of the channel's posts reads the context here, so that it gives the channel
 * the same context as the queue does.
 *
 * Each block builds as a separate script, so a React context that one script provides is not
 * the one that another script reads. This function reads only the stores, which are shared.
 *
 * @param select   The data registry's `select`.
 * @param clientId Client ID of the block.
 * @return The context, or null while the block above it that gives it its context loads.
 */
export function channelQueueContext(select: any, clientId: string): Record<string, unknown> | null {
  return channelQueue(select, clientId).context;
}

/**
 * Get the first post that a block takes, given the blocks before it in the editor.
 *
 * `useSelect()` gives back the same object until the ID or the type changes, because it compares
 * the result shallowly.
 *
 * @param clientId Client ID of the block.
 * @return The post, or null while channels load.
 */
export default function useChannelQueuePost(clientId: string): ChannelQueuePost | null {
  return useSelect(
    (select) => channelQueuePost(select, clientId),
    [clientId],
  );
}

/**
 * Get each post that a block takes, given the blocks before it in the editor. An entry is null
 * when the queue has no post for it. The block's own `postId` context is the context around it,
 * not one of these posts.
 *
 * `useSelect()` compares its result shallowly, and the queue gives a new array each time, so the
 * hook compares the posts by value and gives back the same array until one of them changes.
 *
 * @param clientId Client ID of the block.
 * @return The posts, or null while channels load.
 */
export function useChannelQueuePosts(clientId: string): ChannelBlockPosts | null {
  const postsKey = useSelect(
    (select) => JSON.stringify(channelQueuePosts(select, clientId)),
    [clientId],
  );

  return useMemo(() => JSON.parse(postsKey), [postsKey]);
}
