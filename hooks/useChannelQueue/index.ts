// WordPress dependencies.
import { store as blockEditorStore } from '@wordpress/block-editor';
import { store as blocksStore } from '@wordpress/blocks';
import { useSelect } from '@wordpress/data';

// Plugin dependencies.
import {
  channelArgFields,
  hasEveryChannelArg,
  isChannelProvider,
  pickChannelArgs,
  postDefaultChannel,
  toBlockChannelArgs,
  toChannelName,
} from '../useBlockChannel';
import { CHANNEL_PAGE_SIZE, type ChannelRecord } from '../useChannelRecord';

const NO_IDS: number[] = [];

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
 * Get the IDs that a block with a channel shows, given the blocks before it in the editor.
 *
 * This is a plain function of `select`, so that a block bindings source's `getValues()`, which
 * cannot call hooks, can use it. `useChannelQueue()` wraps it for components.
 *
 * Keep the rules in sync with `Channel_Queues` in PHP. Blocks take IDs in document order:
 *
 * - A single-item block shows its ref, or else the top of its channel's queue. That ID is then
 *   removed from the queue.
 * - A list block takes every ID that is left in its channel's queue.
 * - A block that supports `wp-curate/channel`, like Many Posts, takes nothing.
 *
 * A block without a channel of its own uses the channel that `toBlockChannel()` describes. A
 * channel has a separate queue for each set of arguments that it reads, and has no posts until the
 * block gives it each of them.
 *
 * A block waits only for its own channel and for the block that gives it its context, so a block
 * that changes its channel does not make the other blocks wait.
 *
 * @param select         The data registry's `select`.
 * @param clientId       Client ID of the block.
 * @param previewContext Context for a block shown as a preview, which includes only its own blocks.
 * @return The IDs, or null while channels load.
 */
export function channelQueueIds(
  select: any,
  clientId: string,
  previewContext: Record<string, unknown> = {},
): number[] | null {
  const {
    getBlocks,
    getSettings,
  } = select(blockEditorStore);

  const {
    getBlockType,
  } = select(blocksStore);

  const {
    getChannel,
  } = select('wp-curate/channels') as any;

  const postChannel = postDefaultChannel(select);

  // Every block can use the post's default channel, so all of them wait for it.
  if (postChannel === null) {
    return null;
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
  let out = NO_IDS;

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
    let ref = 0;
    let taken = NO_IDS;

    if (name === '') {
      name = postChannel;
    }

    if (providerName !== null) {
      name = providerName;
    }

    if (Number.isInteger(block.attributes.ref)) {
      ref = block.attributes.ref;
    }

    // A single-item block takes its ref, if it has one.
    if (ref > 0) {
      taken = [ref];
    }

    // Without a channel, there is nothing to take.
    if (name === null || name === '') {
      return {
        isLoading,
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
        taken,
      };
    }

    // Do not request a channel with context that is not known yet.
    if (isContextLoading || loadingChannels.has(loadingKey)) {
      loadingChannels.add(loadingKey);

      return {
        isLoading: true,
        taken,
      };
    }

    // The first page of the channel tells which context the channel uses.
    const record: ChannelRecord | null = getChannel(name, args, context, CHANNEL_PAGE_SIZE);

    if (record === null) {
      isLoading = true;
    }

    if (record !== null) {
      // Key the queue by the arguments and context that the channel uses, like PHP does.
      const used = Object.fromEntries(
        record.uses_context.map((usedKey: string) => [usedKey, context[usedKey]]),
      );

      const key = JSON.stringify([name, args, used]);

      let previous = NO_IDS;

      if (takenFromQueues.has(key)) {
        previous = takenFromQueues.get(key) as number[];
      }

      /*
       * Without a ref, the block takes the top of the queue. Every ID taken before can be in the
       * queue, so load that many IDs plus one, in whole pages.
       */
      if (ref === 0) {
        const count = Math.ceil((previous.length + 1) / CHANNEL_PAGE_SIZE) * CHANNEL_PAGE_SIZE;
        const loaded: ChannelRecord | null = getChannel(name, args, context, count);

        if (loaded === null) {
          isLoading = true;
        }

        if (loaded !== null) {
          const top = loaded.ids.find((id) => !previous.includes(id));

          if (top !== undefined) {
            taken = [top];
          }
        }
      }

      takenFromQueues.set(key, [...previous, ...taken]);
    }

    if (isLoading) {
      loadingChannels.add(loadingKey);
    }

    return {
      isLoading,
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
          taken,
        } = take(block, context, providerChannel, isContextLoading);

        if (block.clientId === clientId) {
          isOutLoading = isLoading;
          out = taken;
        }

        // Until the block's post is known, the blocks inside it do not know their context.
        if (isLoading) {
          isChildContextLoading = true;
        }

        // A Single Post gives its post to the blocks inside it.
        if (taken.length > 0) {
          childContext = {
            postId: taken[0],
            postType: block.attributes.postType,
          };
        }
      }

      walk(block.innerBlocks, childContext, childChannel, isChildContextLoading);
    });
  };

  /*
   * A preview, such as one term of a Many Terms block, has its own block editor store that holds
   * only the preview's blocks. Their term comes from the preview's context, not from a parent.
   */
  const {
    isPreviewMode,
  } = getSettings();

  let startContext: Record<string, unknown> = {};

  if (isPreviewMode === true) {
    startContext = previewContext;
  }

  walk(getBlocks(), startContext, undefined, false);

  let ids: number[] | null = out;

  if (isOutLoading) {
    ids = null;
  }

  return ids;
}

/**
 * Get the IDs that a block with a channel shows, given the blocks before it in the editor.
 *
 * @param clientId       Client ID of the block.
 * @param previewContext Context for a block shown as a preview, which includes only its own blocks.
 * @return The IDs, or null while channels load.
 */
export default function useChannelQueue(
  clientId: string,
  previewContext: Record<string, unknown> = {},
): number[] | null {
  // Compare the context by value, since callers pass a new object on each render.
  const contextKey = JSON.stringify(previewContext);

  return useSelect(
    (select) => channelQueueIds(select, clientId, JSON.parse(contextKey)),
    [clientId, contextKey],
  );
}
