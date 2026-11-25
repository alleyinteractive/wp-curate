// WordPress dependencies.
import { store as blockEditorStore } from '@wordpress/block-editor';
import { BlockInstance, cloneBlock } from '@wordpress/blocks';

// Plugin dependencies.
import toInnerBlockTemplate from '../innerBlockTemplate';
import planLayoutCopies, { LayoutSnapshot } from '../planLayoutCopies';

/**
 * The parts of a data registry that `syncLayouts()` uses.
 */
export interface SyncLayoutsRegistry {
  batch: (callback: () => void) => void;
  dispatch: (store: unknown) => any;
  select: (store: unknown) => any;
  subscribe: (listener: () => void, store: unknown) => () => void;
}

/**
 * Keeps the inner blocks of the blocks in each group the same, until the returned function is
 * called.
 *
 * `look` returns the blocks in each group and their inner blocks, as `getBlocks()` returns them.
 * After each change to the block editor store, `planLayoutCopies()` compares them to the blocks
 * that `look` returned before, and the inner blocks are copied as it plans. The copies are not
 * persistent changes, so they are part of the undo step of the change that caused them.
 *
 * @param registry The data registry of the block editor.
 * @param look     Returns the blocks in each group.
 * @return Function that stops the sync.
 */
export default function syncLayouts(
  registry: SyncLayoutsRegistry,
  look: () => LayoutSnapshot,
): () => void {
  const {
    getBlocks,
  } = registry.select(blockEditorStore);

  const {
    __unstableMarkNextChangeAsNotPersistent: markNextChangeAsNotPersistent,
    replaceInnerBlocks,
  } = registry.dispatch(blockEditorStore);

  let seen = look();
  let isCopying = false;

  // Compares blocks by name, attributes, and inner blocks, not by client ID.
  const toKey = (blocks: BlockInstance[]) => JSON.stringify(toInnerBlockTemplate(blocks));

  return registry.subscribe(() => {
    // The copies change the store too. Ignore those changes.
    if (isCopying) {
      return;
    }

    const now = look();
    let didCopy = false;

    planLayoutCopies(seen, now).forEach(({ source, targets }) => {
      const sourceBlocks: BlockInstance[] = getBlocks(source);
      const sourceKey = toKey(sourceBlocks);
      const differentTargets = targets.filter((id) => toKey(getBlocks(id)) !== sourceKey);

      if (differentTargets.length === 0) {
        return;
      }

      isCopying = true;
      didCopy = true;

      registry.batch(() => {
        differentTargets.forEach((id) => {
          markNextChangeAsNotPersistent();
          replaceInnerBlocks(id, sourceBlocks.map((block) => cloneBlock(block)), false);
        });
      });

      isCopying = false;
    });

    seen = didCopy ? look() : now;
  }, blockEditorStore);
}
