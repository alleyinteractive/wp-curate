// Global dependencies.
import React from 'react';

// WordPress dependencies.
import {
  // @ts-expect-error BlockSettingsMenuControls not available in types yet.
  BlockSettingsMenuControls,
  store as blockEditorStore,
} from '@wordpress/block-editor';
import { MenuItem } from '@wordpress/components';
import { useRegistry, useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// Plugin dependencies.
import joinLayoutGroup from '../../../services/joinLayoutGroup';
import {
  LAYOUT_GROUP_ATTRIBUTE,
  SINGLE_POST_BLOCK,
  entityRootOf,
  layoutGroupMembers,
  layoutGroupOf,
  replacementKeysOf,
} from '../../../services/layoutGroups';
import { LayoutSnapshot } from '../../../services/planLayoutCopies';
import syncLayouts, { SyncLayoutsRegistry } from '../../../services/syncLayouts';

/**
 * Keeps the inner blocks of the Single Post blocks in each layout group the same, in the whole
 * editor. See `services/layoutGroups`.
 */
function useLayoutGroupSync() {
  // `useRegistry` is typed as returning `Function`.
  const registry = useRegistry() as unknown as SyncLayoutsRegistry;

  useEffect(() => {
    const selectors = registry.select(blockEditorStore);

    const {
      getBlocks,
      getBlocksByName,
    } = selectors;

    const look = (): LayoutSnapshot => {
      const out: LayoutSnapshot = new Map();
      const all: string[] = getBlocksByName(SINGLE_POST_BLOCK);

      all.forEach((clientId) => {
        const group = layoutGroupOf(selectors, clientId);

        if (group !== '') {
          out.set(clientId, {
            group,
            innerBlocks: getBlocks(clientId),
          });
        }
      });

      return out;
    };

    return syncLayouts(registry, look);
  }, [registry]);
}

/**
 * Gives a new key to the Single Post blocks with a template key, such as from a pattern, so that
 * each insert of the pattern makes a new group. See `isTemplateKey()`.
 *
 * The change is not persistent, so it is part of the undo step of the insert.
 */
function useTemplateKeyReplacement() {
  // `useRegistry` is typed as returning `Function`.
  const registry = useRegistry() as unknown as SyncLayoutsRegistry;

  useEffect(() => {
    const selectors = registry.select(blockEditorStore);

    const {
      __unstableMarkNextChangeAsNotPersistent: markNextChangeAsNotPersistent,
      updateBlockAttributes,
    } = registry.dispatch(blockEditorStore);

    let isReplacing = false;

    const replace = () => {
      // The replacement changes the store too. Ignore that change.
      if (isReplacing) {
        return;
      }

      const keys = replacementKeysOf(selectors);

      if (keys.size === 0) {
        return;
      }

      const clientIds = Array.from(keys.keys());
      const attributes: Record<string, Record<string, string>> = {};

      keys.forEach((key, clientId) => {
        attributes[clientId] = { [LAYOUT_GROUP_ATTRIBUTE]: key };
      });

      isReplacing = true;
      markNextChangeAsNotPersistent();
      // With `uniqueByBlock`, `attributes` gives the attributes of each block by client ID.
      updateBlockAttributes(clientIds, attributes, { uniqueByBlock: true });
      isReplacing = false;
    };

    // Blocks that are in the editor before the plugin loads.
    replace();

    return registry.subscribe(replace, blockEditorStore);
  }, [registry]);
}

/**
 * The items in the block options menu that change the layout groups of the selected Single Post
 * blocks. Each item shows only when it can do something.
 *
 * - "Share Single Post Layout" shows when more than one Single Post is selected, all in the same
 *   entity, and they are not already in one group. The selected blocks join the group of the
 *   first block and get its layout. See `entityRootOf()`. The editor can select more than one
 *   block only when they have the same parent. For blocks in different containers, the "Single
 *   Post Layout" panel of the block does the same job.
 * - "Detach Single Post Layout" shows when a selected Single Post shares its layout with another
 *   block. It clears the group of each selected block. The blocks keep their inner blocks.
 */
function SharedLayoutMenuItems({
  clientIds,
  onClose,
}: {
  clientIds: string[];
  onClose: () => void;
}) {
  // `useRegistry` is typed as returning `Function`.
  const registry = useRegistry() as unknown as SyncLayoutsRegistry;

  const {
    canDetach,
    canShare,
  } = useSelect((select) => {
    const selectors = select(blockEditorStore) as any;

    const {
      getBlockNamesByClientId,
    } = selectors;

    const names: string[] = getBlockNamesByClientId(clientIds);

    let detach = false;
    let share = false;

    if (names.length > 0 && names.every((name) => name === SINGLE_POST_BLOCK)) {
      detach = clientIds.some((id) => layoutGroupMembers(selectors, id).length > 1);

      if (clientIds.length > 1) {
        const roots = new Set(clientIds.map((id) => entityRootOf(selectors, id)));
        const groups = new Set(clientIds.map((id) => layoutGroupOf(selectors, id)));

        share = roots.size === 1 && (groups.size > 1 || groups.has(''));
      }
    }

    return {
      canDetach: detach,
      canShare: share,
    };
  }, [clientIds]);

  const share = () => {
    const [first, ...others] = clientIds;

    joinLayoutGroup(registry, first, others);
    onClose();
  };

  const detach = () => {
    const {
      updateBlockAttributes,
    } = registry.dispatch(blockEditorStore);

    updateBlockAttributes(clientIds, { [LAYOUT_GROUP_ATTRIBUTE]: '' });
    onClose();
  };

  return (
    <>
      {canShare ? (
        <MenuItem onClick={share}>
          {__('Share Single Post Layout', 'wp-curate')}
        </MenuItem>
      ) : null}
      {canDetach ? (
        <MenuItem onClick={detach}>
          {__('Detach Single Post Layout', 'wp-curate')}
        </MenuItem>
      ) : null}
    </>
  );
}

/**
 * Shared layouts of Single Post blocks: the sync of each group, the new keys for template keys,
 * and the menu items that change the groups.
 */
export default function SharedLayouts() {
  useTemplateKeyReplacement();
  useLayoutGroupSync();

  return (
    <BlockSettingsMenuControls>
      {(fillProps: { onClose: () => void; selectedClientIds: string[] }) => (
        <SharedLayoutMenuItems
          clientIds={fillProps.selectedClientIds}
          onClose={fillProps.onClose}
        />
      )}
    </BlockSettingsMenuControls>
  );
}
