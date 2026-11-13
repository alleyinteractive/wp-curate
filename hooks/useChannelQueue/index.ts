// WordPress dependencies.
import { store as blockEditorStore } from '@wordpress/block-editor';
import { store as blocksStore } from '@wordpress/blocks';
import { useSelect } from '@wordpress/data';
import { useMemo } from '@wordpress/element';

// Plugin dependencies.
import {
  channelArgFields,
  channelContext,
  hasEveryChannelArg,
  isChannelProvider,
  pickChannelArgs,
  pinsPost,
  takesRemainingPosts,
  toBlockChannel,
  toBlockChannelArgs,
  toChannelName,
} from '../useBlockChannel';
import { CHANNEL_PAGE_SIZE, type ChannelResults } from '../useChannelResults';

/**
 * The most posts that a block that takes the remaining posts, like Channel Template, can take.
 *
 * Keep the value matched with `Channel_Block_Support::MAX_REMAINING_POSTS` in PHP.
 */
const MAX_REMAINING_POSTS = 100;

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

const NO_POSTS: ChannelQueuePost[] = [];

/**
 * The context that tells the block its channel and the data the block takes from the channel.
 */
interface ChannelQueue {
  /** The context, or null while the block above it that gives it its context loads. */
  context: Record<string, unknown> | null;
  /**
   * The posts, or null while channels load. A block that takes one post has one or none. A block
   * that takes the remaining posts has each of them.
   */
  posts: ChannelQueuePost[] | null;
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
 * Pairs the IDs that a block takes with their post types.
 *
 * @param ids       Post IDs.
 * @param postTypes The post type of each ID, in the same order.
 */
function toPosts(ids: number[], postTypes: string[]): ChannelQueuePost[] {
  return ids.map((postId, index) => {
    let postType = '';

    if (typeof postTypes[index] === 'string') {
      postType = postTypes[index];
    }

    return {
      postId,
      postType,
    };
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
 * Get the post that a block with a channel takes, given the blocks before it in the editor, and
 * the context that the block gives its channel.
 *
 * Keep the rules in sync with `Queues` in PHP. Blocks take IDs in document order:
 *
 * - A single-item block shows the top of its channel's queue. A Single Post shows its ref instead,
 *   if it has one. That ID is then removed from the queue. Other block types cannot pin a post, so
 *   their `ref` attribute has no meaning here. See `pinsPost()`.
 * - A block that takes the remaining posts, like Channel Template, shows each ID that remains in
 *   its channel's queue, up to `MAX_REMAINING_POSTS`. Those IDs are then removed from the queue.
 * - A block that provides the `wp-curate/channel` context, like Channel Content, takes nothing.
 * - A block without a channel takes nothing. Its inner blocks get its context.
 *   Inside a provider, a block has the provider's channel, so it has none if the provider has
 *   none. Outside a provider, it has its own channel.
 *
 * A block uses the channel that `toBlockChannel()` describes. A channel has a separate queue for
 * each set of arguments that it accepts and context that it reads, and has no posts until the
 * block gives it each argument. The context of a block inside a block that takes a post, like
 * Single Post, has that post as `postId` and `postType`, the way that `Channel_Block_Support`
 * gives it in PHP. Otherwise, it has the post.
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
   * Take the IDs that a block renders from its queue. The block is loading if its channel is
   * loading, or if the block above it that gives it its context is loading.
   *
   * A block inside a provider uses the provider's channel and arguments, even if the block has its
   * own from before it moved in.
   */
  const take = (
    block: any,
    context: Record<string, unknown>,
    providerChannel: unknown,
    takesRemaining: boolean,
    canPin: boolean,
    isContextLoading: boolean,
  ) => {
    const providerName = toChannelName(providerChannel);

    let isLoading = false;
    let name = toChannelName(channelAttribute(block));
    let pinnedPostType = '';
    let postTypes: string[] = [];
    let ref = 0;
    let taken = NO_IDS;

    if (providerName !== null) {
      name = providerName;
    }

    // Only a Single Post can pin a post.
    if (canPin && Number.isInteger(block.attributes.ref)) {
      ref = block.attributes.ref;
    }

    // A block that can pin a post takes its ref, if it has one.
    if (ref > 0) {
      taken = [ref];
    }

    // A pinned post can be past the IDs that have loaded, so the block saves its post type.
    if (ref > 0 && typeof block.attributes.postType === 'string') {
      pinnedPostType = block.attributes.postType;
    }

    // The walk does not call this for a block without a channel. Like that block, take nothing.
    if (name === null || name === '') {
      return {
        isLoading,
        posts: NO_POSTS,
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
        posts: toPosts(taken, [pinnedPostType]),
      };
    }

    // Do not request a channel with context that is not known yet.
    if (isContextLoading || loadingChannels.has(loadingKey)) {
      loadingChannels.add(loadingKey);

      return {
        isLoading: true,
        posts: toPosts(taken, [pinnedPostType]),
      };
    }

    // Send and key the queue by only the context that the channel uses, like PHP does.
    const used = channelContext(select, name, context);
    const results: ChannelResults | null = getChannelResults(name, args, used, CHANNEL_PAGE_SIZE);

    if (results === null) {
      isLoading = true;
    }

    if (results !== null) {
      const key = JSON.stringify([name, args, used]);

      let previous = NO_IDS;

      if (takenFromQueues.has(key)) {
        previous = takenFromQueues.get(key) as number[];
      }

      // The IDs removed from the queue.
      const skipped = new Set(previous);

      /*
       * A block that takes the remaining posts takes each ID that remains, up to the limit. Every
       * ID taken before can be in the queue, so load that many IDs plus the limit, in whole pages.
       * Then the loaded IDs hold as many remaining IDs as the block can take, or every one.
       */
      if (ref === 0 && takesRemaining) {
        const count = Math.ceil(
          (previous.length + MAX_REMAINING_POSTS) / CHANNEL_PAGE_SIZE,
        ) * CHANNEL_PAGE_SIZE;

        const loaded: ChannelResults | null = getChannelResults(name, args, used, count);

        if (loaded === null) {
          isLoading = true;
        }

        if (loaded !== null) {
          taken = loaded.ids.filter((id) => !skipped.has(id)).slice(0, MAX_REMAINING_POSTS);
          postTypes = taken.map((id) => getTypeOfPostInChannel(id));
        }
      }

      /*
       * Without a ref, any other block takes the top of the queue. Every ID taken before can be in
       * the queue, so load that many IDs plus one, in whole pages, and then a page more each time
       * that every loaded ID was removed.
       */
      if (ref === 0 && !takesRemaining) {
        let count = Math.ceil((previous.length + 1) / CHANNEL_PAGE_SIZE) * CHANNEL_PAGE_SIZE;
        let isSearching = true;

        while (isSearching) {
          const loaded: ChannelResults | null = getChannelResults(name, args, used, count);

          isSearching = false;

          if (loaded === null) {
            isLoading = true;
          }

          if (loaded !== null) {
            const top = loaded.ids.find((id) => !skipped.has(id));

            if (top !== undefined) {
              postTypes = [getTypeOfPostInChannel(top)];
              taken = [top];
            }

            // The store gives results with fewer IDs than the count only at the channel's end.
            if (top === undefined && loaded.has_more && loaded.ids.length >= count) {
              count += CHANNEL_PAGE_SIZE;
              isSearching = true;
            }
          }
        }
      }

      takenFromQueues.set(key, [...previous, ...taken]);
    }

    if (isLoading) {
      loadingChannels.add(loadingKey);
    }

    // A pinned post keeps the post type that the block saved.
    if (ref > 0) {
      postTypes = [pinnedPostType];
    }

    return {
      isLoading,
      posts: toPosts(taken, postTypes),
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
      const takesRemaining = takesRemainingPosts(blockType);
      const canPin = pinsPost(blockType);
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

      if (!isProvider && name !== null && !hasNoChannel) {
        const {
          isLoading,
          posts,
        } = take(block, context, providerChannel, takesRemaining, canPin, isContextLoading);

        if (block.clientId === clientId) {
          isOutLoading = isLoading;
          outPosts = posts;
        }

        // Until the block's post is known, the blocks inside it do not know their context.
        if (isLoading) {
          isChildContextLoading = true;
        }

        /*
         * A Single Post gives its post to the blocks inside it, or no post if it has none. A
         * Channel Template block gives each post to its template on the page, but the editor has
         * only one copy of the template, so it gives the first post here.
         */
        let post = NO_POST;

        if (posts.length > 0) {
          [post] = posts;
        }

        childContext = { ...post };
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

  let posts: ChannelQueuePost[] | null = outPosts;

  if (isOutLoading) {
    posts = null;
  }

  return {
    context: outContext,
    posts,
  };
}

/**
 * Get the post that a block takes from its channel, given the blocks before it in the editor, as
 * the `postId` and `postType` context that the block gives the blocks inside it.
 *
 * This is a plain function of `select`, so that a label callback, which cannot call hooks, can use
 * it. `useChannelQueuePost()` wraps it for components.
 *
 * @param select   The data registry's `select`.
 * @param clientId Client ID of the block.
 * @return The post, or null while channels load.
 */
export function channelQueuePost(select: any, clientId: string): ChannelQueuePost | null {
  const {
    posts,
  } = channelQueue(select, clientId);

  let post: ChannelQueuePost | null = null;

  if (posts !== null) {
    post = NO_POST;
  }

  if (posts !== null && posts.length > 0) {
    [post] = posts;
  }

  return post;
}

/**
 * Get the block context that a block gives its channel, such as the `postId` of the Single Post
 * around it. The block's own `postId` and `postType` context is the post that it takes, so a
 * picker of the channel's posts reads the context here, the way that the queue does.
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
 * Get the post that a block takes from its channel, given the blocks before it in the editor.
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
 * Get the posts that a block that takes the remaining posts in its channel's queue takes, like
 * Channel Template, given the blocks before it in the editor. The block's `postId` context is the
 * first of them.
 *
 * `useSelect()` compares its result shallowly, and the queue gives a new array each time, so the
 * hook compares the posts by value and gives back the same array until one of them changes.
 *
 * @param clientId Client ID of the block.
 * @return The posts, or null while channels load.
 */
export function useChannelQueuePosts(clientId: string): ChannelQueuePost[] | null {
  const postsKey = useSelect(
    (select) => JSON.stringify(channelQueue(select, clientId).posts),
    [clientId],
  );

  return useMemo(() => JSON.parse(postsKey), [postsKey]);
}
