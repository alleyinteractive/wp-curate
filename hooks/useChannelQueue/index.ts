// WordPress dependencies.
import { store as blockEditorStore } from '@wordpress/block-editor';
import { store as blocksStore } from '@wordpress/blocks';
import { useSelect } from '@wordpress/data';

// Plugin dependencies.
import {
  channelArgFields,
  channelContext,
  defaultChannel,
  hasEveryChannelArg,
  isChannelProvider,
  pickChannelArgs,
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
 * The context that tells the block its channel and the data the block takes from the channel.
 */
interface ChannelQueue {
  /** The context, or null while the block above it that gives it its context loads. */
  context: Record<string, unknown> | null;
  /** The post, or null while channels load. */
  post: ChannelQueuePost | null;
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
 * - A single-item block with a ref shows its ref and leaves every queue as it is.
 * - Any other single-item block takes the next ID off the top of its channel's queue.
 * - A block that provides the `wp-curate/channel` context, like Channel Content, takes nothing.
 *
 * A block without a channel of its own uses the channel that `toBlockChannel()` describes. A
 * channel has a separate queue for each set of arguments that it accepts and context that it
 * reads, and has no posts until the block gives it each argument. The context of a block inside a
 * block that takes a post, like Single Post, has that post as `postId` and `postType`, the way
 * that `Channel_Block_Support` gives it in PHP. Otherwise, it has the post.
 *
 * Queues do not know about each other, so blocks in different queues can show the same post.
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
    getChannelResults,
    getTypeOfPostInChannel,
  } = select('wp-curate/channels') as any;

  const globalChannel = defaultChannel(select);

  // Every block can use the default channel, so all of them wait for the list of channels.
  if (globalChannel === null) {
    return {
      context: null,
      post: null,
    };
  }

  /*
   * The number of IDs taken so far from each queue, keyed by the channel and the arguments and
   * context that it uses.
   */
  const takenCounts = new Map<string, number>();

  /*
   * The channels that are loading for a block, with their arguments. The blocks after it in the
   * same channel with the same arguments cannot know their IDs until it loads, but the blocks in
   * others can.
   */
  const loadingChannels = new Set<string>();

  let isOutLoading = false;
  let outContext: Record<string, unknown> | null = null;
  let outPost = NO_POST;

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
    isContextLoading: boolean,
  ) => {
    const providerName = toChannelName(providerChannel);

    let isLoading = false;
    let name = toChannelName(channelAttribute(block));
    let postType = '';
    let ref = 0;
    let taken = NO_IDS;

    if (name === '') {
      name = globalChannel;
    }

    if (providerName !== null) {
      name = providerName;
    }

    if (Number.isInteger(block.attributes.ref)) {
      ref = block.attributes.ref;
    }

    /*
     * A single-item block with a ref takes the ref and nothing from its queue. A pinned post can
     * be past the IDs that have loaded, so the block saves its post type.
     */
    if (ref > 0) {
      taken = [ref];

      if (typeof block.attributes.postType === 'string') {
        ({ postType } = block.attributes);
      }

      return {
        isLoading,
        postType,
        taken,
      };
    }

    // Without a channel, there is nothing to take.
    if (name === null || name === '') {
      return {
        isLoading,
        postType,
        taken,
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
        postType,
        taken,
      };
    }

    // Do not request a channel with context that is not known yet.
    if (isContextLoading || loadingChannels.has(loadingKey)) {
      loadingChannels.add(loadingKey);

      return {
        isLoading: true,
        postType,
        taken,
      };
    }

    // Send and key the queue by only the context that the channel uses, like PHP does.
    const used = channelContext(select, name, context);
    const key = JSON.stringify([name, args, used]);

    // The position of the top of the queue, after the IDs that the blocks before took.
    let index = 0;

    if (takenCounts.has(key)) {
      index = takenCounts.get(key) as number;
    }

    // Load the IDs through the top, in whole pages.
    const count = Math.ceil((index + 1) / CHANNEL_PAGE_SIZE) * CHANNEL_PAGE_SIZE;
    const results: ChannelResults | null = getChannelResults(name, args, used, count);

    if (results === null) {
      isLoading = true;
    }

    // The store gives results with fewer IDs than the count only at the channel's end.
    if (results !== null && index < results.ids.length) {
      const top = results.ids[index];

      postType = getTypeOfPostInChannel(top);
      taken = [top];
    }

    if (results !== null) {
      takenCounts.set(key, index + 1);
    }

    if (isLoading) {
      loadingChannels.add(loadingKey);
    }

    return {
      isLoading,
      postType,
      taken,
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
      const isProvider = isChannelProvider(getBlockType(block.name));
      const name = toChannelName(channelAttribute(block));

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

      if (!isProvider && name !== null) {
        const {
          isLoading,
          postType,
          taken,
        } = take(block, context, providerChannel, isContextLoading);

        let post = NO_POST;

        if (taken.length > 0) {
          post = {
            postId: taken[0],
            postType,
          };
        }

        if (block.clientId === clientId) {
          isOutLoading = isLoading;
          outPost = post;
        }

        // Until the block's post is known, the blocks inside it do not know their context.
        if (isLoading) {
          isChildContextLoading = true;
        }

        // A Single Post gives its post to the blocks inside it, or no post if it has none.
        childContext = { ...post };
      }

      /*
       * Read the inner blocks from the store, not from `block.innerBlocks`. A block with
       * controlled inner blocks, like Post Content in "Show template" mode or a synced pattern,
       * keeps them only under its own client ID in the store.
       */
      walk(getBlocks(block.clientId), childContext, childChannel, isChildContextLoading);
    });
  };

  walk(getBlocks(), postContext(select), undefined, false);

  let post: ChannelQueuePost | null = outPost;

  if (isOutLoading) {
    post = null;
  }

  return {
    context: outContext,
    post,
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
  return channelQueue(select, clientId).post;
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
