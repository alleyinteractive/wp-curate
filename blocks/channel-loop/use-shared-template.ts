// WordPress dependencies.
import { store as blockEditorStore } from '@wordpress/block-editor';
import { BlockInstance, cloneBlock } from '@wordpress/blocks';
import { useRegistry } from '@wordpress/data';
import { useEffect } from '@wordpress/element';

// Plugin dependencies.
import toInnerBlockTemplate from '../../services/innerBlockTemplate';

/**
 * Keeps the inner blocks of the Single Post blocks in a Channel Loop block the same.
 *
 * Each Single Post block saves its own copy of the template. When the inner blocks of one Single
 * Post change, the hook copies them to the other Single Posts. A Single Post that joins the loop,
 * such as from the appender or by a move, gets a copy of the template of the Single Posts already
 * there. The copies are not persistent changes, so they are part of the undo step of the change
 * that caused them.
 *
 * When the inner blocks of more than one Single Post change at once, such as by undo or redo, the
 * hook copies nothing, because there is no one copy to follow.
 *
 * @param clientId Client ID of the Channel Loop block.
 */
export default function useSharedTemplate(clientId: string) {
  // `useRegistry` is typed as returning `Function`.
  const registry = useRegistry() as unknown as {
    batch: (callback: () => void) => void;
    dispatch: (store: unknown) => any;
    select: (store: unknown) => any;
    subscribe: (listener: () => void, store: unknown) => () => void;
  };

  useEffect(() => {
    const {
      getBlockOrder,
      getBlocks,
    } = registry.select(blockEditorStore);

    const {
      __unstableMarkNextChangeAsNotPersistent: markNextChangeAsNotPersistent,
      replaceInnerBlocks,
    } = registry.dispatch(blockEditorStore);

    // The inner blocks of each Single Post, as the hook last saw them.
    const look = () => new Map<string, BlockInstance[]>(
      getBlockOrder(clientId).map((id: string) => [id, getBlocks(id)]),
    );

    let seen = look();
    let isCopying = false;

    // Compares blocks by name, attributes, and inner blocks, not by client ID.
    const toKey = (blocks: BlockInstance[]) => JSON.stringify(toInnerBlockTemplate(blocks));

    const copy = (source: BlockInstance[], targets: string[]) => {
      const sourceKey = toKey(source);
      const differentTargets = targets.filter((id) => toKey(getBlocks(id)) !== sourceKey);

      if (differentTargets.length === 0) {
        return;
      }

      isCopying = true;

      registry.batch(() => {
        differentTargets.forEach((id) => {
          markNextChangeAsNotPersistent();
          replaceInnerBlocks(id, source.map((block) => cloneBlock(block)), false);
        });
      });

      isCopying = false;
    };

    const unsubscribe = registry.subscribe(() => {
      if (isCopying) {
        return;
      }

      const order: string[] = getBlockOrder(clientId);
      const changed = order.filter((id) => seen.has(id) && seen.get(id) !== getBlocks(id));
      const added = order.filter((id) => !seen.has(id));

      if (changed.length === 1) {
        const [source] = changed;

        copy(getBlocks(source), order.filter((id) => id !== source));
      } else if (changed.length === 0 && added.length > 0) {
        const existing = order.find((id) => seen.has(id));

        // A Single Post that joins a loop with no other Single Posts keeps its inner blocks.
        if (existing !== undefined) {
          copy(getBlocks(existing), added);
        }
      }

      seen = look();
    }, blockEditorStore);

    return unsubscribe;
  }, [clientId, registry]);
}
