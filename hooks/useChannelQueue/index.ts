// WordPress dependencies.
import { store as blockEditorStore } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';

// Plugin dependencies.
import type { ChannelRecord } from '../useChannelRecord';

const NO_IDS: number[] = [];

/**
 * The channel of a block that takes from queues, or null for any other block.
 *
 * @param block Block.
 */
function blockChannel(block: unknown): string | null {
  let name: string | null = null;

  if (typeof block !== 'object' || block === null) {
    return name;
  }

  const {
    attributes,
  } = block as Record<string, unknown>;

  if (typeof attributes !== 'object' || attributes === null) {
    return name;
  }

  const {
    channel,
  } = attributes as Record<string, unknown>;

  if (typeof channel === 'string') {
    name = channel;
  }

  return name;
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
    getChannel,
  } = select('wp-curate/channels') as any;

  const queues = new Map<string, number[]>();

  let isLoading = false;
  let out = NO_IDS;

  // The key of a block's channel queue, or null if there is none.
  const queueKey = (block: any, context: Record<string, unknown>) => {
    const name = blockChannel(block);

    let record: ChannelRecord | null = null;
    let key: string | null = null;

    if (name !== null && name !== '') {
      record = getChannel(name, context);

      // The store holds no record for the channel until the channel loads from the server.
      if (record === null) {
        isLoading = true;
      }
    }

    if (record !== null) {
      // Key the queue by the context that the channel uses, like PHP does.
      const used = Object.fromEntries(
        record.uses_context.map((usedKey: string) => [usedKey, context[usedKey]]),
      );

      key = JSON.stringify([name, used]);

      if (!queues.has(key)) {
        queues.set(key, record.ids);
      }
    }

    return key;
  };

  // Take the IDs that a block renders from its queue.
  const take = (block: any, context: Record<string, unknown>) => {
    const key = queueKey(block, context);

    let queue = NO_IDS;
    let ref = 0;
    let taken = NO_IDS;

    if (key !== null && queues.has(key)) {
      queue = queues.get(key) as number[];
    }

    if (Number.isInteger(block.attributes.ref)) {
      ref = block.attributes.ref;
    }

    // A single-item block takes its ref, or else the top of the queue.
    if (ref > 0) {
      taken = [ref];
    } else if (queue.length > 0) {
      taken = [queue[0]];
    }

    if (key !== null) {
      queues.set(key, queue.filter((queued) => !taken.includes(queued)));
    }

    return taken;
  };

  /*
   * The loop that goes through the block tree in document order, taking IDs from each block's
   * channel queue. The walk "reaches" the clientId that was passed to this function and
   * records what IDs it took from its channel.
   */
  const walk = (blocks: any[], context: Record<string, unknown>) => {
    blocks.forEach((block) => {
      let childContext = context;

      if (blockChannel(block) !== null) {
        const taken = take(block, context);

        if (block.clientId === clientId) {
          out = taken;
        }

        /*
         * A Single Post gives its post to the blocks inside it. A Many Posts block's inner blocks
         * are the editable copy for its first post; the other posts are previews.
         */
        if (taken.length > 0) {
          childContext = {
            postId: taken[0],
            postType: block.attributes.postType,
          };
        }
      }

      walk(block.innerBlocks, childContext);
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

  walk(getBlocks(), startContext);

  let ids: number[] | null = out;

  if (isLoading) {
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
