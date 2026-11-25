// WordPress dependencies.
import { store as blockEditorStore } from '@wordpress/block-editor';
import { BlockInstance, cloneBlock } from '@wordpress/blocks';

// Plugin dependencies.
import {
  LAYOUT_GROUP_ATTRIBUTE,
  newLayoutGroupKey,
  toLayoutGroupKey,
} from '../layoutGroups';
import { SyncLayoutsRegistry } from '../syncLayouts';

/**
 * Puts Single Post blocks in the layout group of a source Single Post, and gives them the inner
 * blocks of the source. If the source has no group, the source and the targets get a new group.
 * This is one undo step.
 *
 * @param registry The data registry of the block editor.
 * @param source   Client ID of the Single Post to take the layout from.
 * @param targets  Client IDs of the Single Posts that join the group.
 */
export default function joinLayoutGroup(
  registry: SyncLayoutsRegistry,
  source: string,
  targets: string[],
) {
  const {
    getBlockAttributes,
    getBlocks,
  } = registry.select(blockEditorStore);

  const {
    replaceInnerBlocks,
    updateBlockAttributes,
  } = registry.dispatch(blockEditorStore);

  let key = toLayoutGroupKey(getBlockAttributes(source));

  if (key === '') {
    key = newLayoutGroupKey();
  }

  const layout: BlockInstance[] = getBlocks(source);

  registry.batch(() => {
    updateBlockAttributes([source, ...targets], { [LAYOUT_GROUP_ATTRIBUTE]: key });

    targets.forEach((id) => {
      replaceInnerBlocks(id, layout.map((block) => cloneBlock(block)), false);
    });
  });
}
