// WordPress dependencies.
import { store as blockEditorStore } from '@wordpress/block-editor';
import { store as blocksStore } from '@wordpress/blocks';
import { useSelect } from '@wordpress/data';
import { useMemo } from '@wordpress/element';

// Plugin dependencies.
import {
  type ChannelSlot,
  channelArgFields,
  channelContext,
  channelInnerContext,
  channelSlots,
  hasChannelSlots,
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
 * The post in each slot of a block, in the order of the slots. A slot is null when the queue has
 * no post for it.
 */
export type ChannelSlotPosts = (ChannelQueuePost | null)[];

const NO_POSTS: ChannelSlotPosts = [];

/**
 * The context that tells the block its channel and the data the block takes from the channel.
 */
interface ChannelQueue {
  /** The context, or null while the block above it that gives it its context loads. */
  context: Record<string, unknown> | null;
  /** The post in each slot of the block, or null while channels load. See `channelSlots()`. */
  posts: ChannelSlotPosts | null;
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
 * The posts of the pinned slots, with null for the other slots.
 *
 * @param slots The block's slots.
 */
function pinnedPosts(slots: ChannelSlot[]): ChannelSlotPosts {
  return slots.map(({ postType, ref }) => {
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

  // A template in the site editor has a string ID, and no post to give.
  if (Number.isInteger(postId) && postId > 0 && typeof postType === 'string') {
    context = {
      postId,
      postType,
    };
  }

  return context;
}

/**
 * Get the posts that a block with a channel takes, given the blocks before it in the editor, and
 * the context that the block gives its channel.
 *
 * Keep the rules in sync with `Queues` in PHP. Blocks take IDs in document order:
 *
 * - A block type with a `channelSlots` callback, like Single Post and Channel Loop, takes an ID for
 *   each of its slots, in order. A pinned slot takes its ref. Another slot takes the top of the
 *   channel's queue. Each ID is then removed from the queue. See `channelSlots()`. Its inner blocks
 *   get the context that its `channelInnerContext` callback gives, or its own context if it has no
 *   callback. See `channelInnerContext()`.
 * - Any other block, such as Channel Content, takes nothing. Its inner blocks get its context.
 * - A block without a channel takes nothing. Its inner blocks get its context.
 *   Inside a provider, a block has the provider's channel, so it has none if the provider has
 *   none. Outside a provider, it has its own channel.
 *
 * A block uses the channel that `toBlockChannel()` describes. A channel has a separate queue for
 * each set of arguments that it accepts and context that it reads, and has no posts until the
 * block gives it each argument. The blocks at the top of the post have the post as context.
 *
 * The blocks that use the same queue never show the same post twice. The queues do not share IDs,
 * so blocks that use different queues can show the same post. A block always shows its own pin. A
 * block waits only for the blocks before it in the same queue.
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

  let isOutLoading = false;
  let outContext: Record<string, unknown> | null = null;
  let outPosts = NO_POSTS;

  /*
   * Take the ID for each slot of a block from its queue. The block is loading if its channel is
   * loading, or if the block above it that gives it its context is loading.
   *
   * A block inside a provider uses the provider's channel and arguments, even if the block has its
   * own from before it moved in.
   */
  const take = (
    block: any,
    context: Record<string, unknown>,
    providerChannel: unknown,
    slots: ChannelSlot[],
    isContextLoading: boolean,
  ) => {
    const providerName = toChannelName(providerChannel);

    // A pinned slot shows its pin while the queue loads, and also if the channel has no posts.
    const pinned = pinnedPosts(slots);

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
        posts: slots.map(() => null),
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

    const openSlots = slots.filter(({ ref }) => ref === 0).length;

    // A block with only pinned slots, or none, needs no IDs from the channel.
    if (openSlots === 0) {
      takenFromQueues.set(key, [...previous, ...slots.map(({ ref }) => ref)]);

      return {
        isLoading,
        posts,
      };
    }

    /*
     * Every ID taken before can be in the queue, so load that many IDs plus one for each open
     * slot, in whole pages. Then load a page more each time that an open slot finds every loaded ID
     * removed, until the channel ends.
     */
    let count = Math.ceil((previous.length + openSlots) / CHANNEL_PAGE_SIZE) * CHANNEL_PAGE_SIZE;
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

        // The count of this request, for the slots below.
        const requested = count;

        // The IDs removed from the queue, which grows as each slot takes an ID.
        const skipped = new Set(previous);

        // The index of the first loaded ID that might not be removed. It only moves forward.
        let next = 0;
        let isShort = false;

        posts = slots.map(({ postType, ref }) => {
          let post: ChannelQueuePost | null = null;

          // A pin is removed from the queue, so the slots after it do not show it again.
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
    providerChannel: unknown,
    isContextLoading: boolean,
  ) => {
    blocks.forEach((block) => {
      const blockType = getBlockType(block.name);
      const isProvider = isChannelProvider(blockType);
      const hasSlots = hasChannelSlots(blockType);
      const name = toChannelName(channelAttribute(block));

      // Like a block without channel support, a block without a channel takes nothing.
      const hasNoChannel = name !== null && toBlockChannel(name, providerChannel) === '';

      let childContext = context;
      let childChannel = providerChannel;
      let isChildContextLoading = isContextLoading;

      if (block.clientId === clientId && !isContextLoading) {
        outContext = context;
      }

      /*
       * Keep the provider's channel apart from `context`, which goes to the channel and is part of
       * the key of its requests.
       */
      if (isProvider && name !== null) {
        childChannel = channelAttribute(block);
      }

      if (hasSlots && name !== null && !hasNoChannel) {
        const {
          isLoading,
          posts,
        } = take(
          block,
          context,
          providerChannel,
          channelSlots(blockType, block.attributes, context),
          isContextLoading,
        );

        if (block.clientId === clientId) {
          isOutLoading = isLoading;
          outPosts = posts;
        }

        // Until the block's post is known, the blocks inside it do not know their context.
        if (isLoading) {
          isChildContextLoading = true;
        }

        // The block type says what context it gives the blocks inside it, as its `render.php` does.
        childContext = channelInnerContext(blockType, block.attributes, context, posts);
      }

      /*
       * Read the inner blocks from the store, not from `block.innerBlocks`. A block with
       * controlled inner blocks, like Post Content in "Show template" mode or a synced pattern,
       * keeps them only under its own client ID in the store.
       */
      walk(
        getBlocks(block.clientId),
        childContext,
        childChannel,
        isChildContextLoading,
      );
    });
  };

  walk(getBlocks(), postContext(select), undefined, false);

  let posts: ChannelSlotPosts | null = outPosts;

  if (isOutLoading) {
    posts = null;
  }

  return {
    context: outContext,
    posts,
  };
}

/**
 * A `channelInnerContext` callback that gives the inner blocks the post in the first slot as their
 * `postId` and `postType` context, or no post if the slot is empty. Single Post and Channel Loop
 * use it. On the page, Single Post gives its post with a context filter in `render.php`. Channel
 * Loop renders a Single Post for each post, but the editor has only one copy of its template, so
 * the template gets the first post.
 *
 * @param attributes Block attributes.
 * @param context    The context around the block.
 * @param posts      The post in each slot of the block.
 */
export function firstPostContext(
  attributes: unknown,
  context: Record<string, unknown>,
  posts: ChannelSlotPosts,
): ChannelQueuePost {
  let post = NO_POST;

  if (posts.length > 0 && posts[0] !== null) {
    [post] = posts;
  }

  return { ...post };
}

/**
 * Get the post in the first slot of a block, given the blocks before it in the editor, as the
 * `postId` and `postType` context that a Single Post gives the blocks inside it.
 *
 * This is a plain function of `select`, so that a label callback, which cannot call hooks, can use
 * it. `useChannelQueuePost()` wraps it for components.
 *
 * @param select   The data registry's `select`.
 * @param clientId Client ID of the block.
 * @return The post, no post if the slot is empty or the block has no slots, or null while
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
 * Get the post in each slot of a block, given the blocks before it in the editor. See
 * `channelSlots()`. The `getChannelPosts()` selector of the `wp-curate/channels` store gives this
 * to the blocks of other plugins.
 *
 * @param select   The data registry's `select`.
 * @param clientId Client ID of the block.
 * @return The posts, or null while channels load.
 */
export function channelQueuePosts(select: any, clientId: string): ChannelSlotPosts | null {
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
 * Get the post in the first slot of a block, given the blocks before it in the editor.
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
 * Get the post in each slot of a block, given the blocks before it in the editor. A slot is null
 * when the queue has no post for it. The block's own `postId` context is the context around it,
 * not one of these posts.
 *
 * `useSelect()` compares its result shallowly, and the queue gives a new array each time, so the
 * hook compares the posts by value and gives back the same array until one of them changes.
 *
 * @param clientId Client ID of the block.
 * @return The posts, or null while channels load.
 */
export function useChannelQueuePosts(clientId: string): ChannelSlotPosts | null {
  const postsKey = useSelect(
    (select) => JSON.stringify(channelQueuePosts(select, clientId)),
    [clientId],
  );

  return useMemo(() => JSON.parse(postsKey), [postsKey]);
}
