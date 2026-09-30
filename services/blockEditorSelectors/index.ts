import { select, useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import type { Block } from '../../types/block';

/**
 * Typed wrappers around `core/block-editor` selectors.
 *
 * The store types describe blocks as `@wordpress/blocks` `BlockInstance`s, which
 * do not match the plugin's `Block` type. The cast is confined to this file so
 * a future change to the store types surfaces here rather than at every call site.
 */

// The `select` argument that `useSelect` passes to its callback.
type RegistrySelect = Parameters<Extract<Parameters<typeof useSelect>[0], Function>>[0];

/**
 * Get a block from the store by client ID.
 *
 * @param {string} clientId The block's client ID.
 * @returns {Block | null}
 */
export function getBlock(clientId: string): Block | null {
  return select(blockEditorStore).getBlock(clientId) as unknown as Block | null;
}

/**
 * Get the blocks under a root block, or the top-level blocks when no root is given.
 *
 * @param {string} [rootClientId] The root block's client ID.
 * @returns {Block[]}
 */
export function getBlocks(rootClientId?: string): Block[] {
  const { getBlocks: selectBlocks } = select(blockEditorStore);
  const blocks = rootClientId === undefined ? selectBlocks() : selectBlocks(rootClientId);
  return (blocks ?? []) as unknown as Block[];
}

/**
 * Get a block by client ID using the registry `select` passed to a `useSelect`
 * callback, so the calling component re-renders when the block changes.
 *
 * @param {Function} registrySelect The `select` argument from `useSelect`.
 * @param {string} clientId The block's client ID.
 * @returns {Block | undefined}
 */
export function getBlockByClientId(
  registrySelect: RegistrySelect,
  clientId: string,
): Block | undefined {
  const blocks = registrySelect(blockEditorStore).getBlocksByClientId(clientId);
  return blocks[0] as unknown as Block | undefined;
}
