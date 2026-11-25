// WordPress dependencies.
import { useSyncExternalStore } from '@wordpress/element';

/*
 * The Single Post blocks that the canvas marks, because the user points to their layout in the
 * "Single Post Layout" panel. Core's `toggleBlockHighlight()` can mark only one block, so the
 * blocks keep this state here. The panel and the blocks are in the same script, so they share it.
 */
let highlighted: string[] = [];

const listeners = new Set<() => void>();

/**
 * Subscribes to changes of the marked blocks.
 *
 * @param listener Called after each change.
 * @return Function that ends the subscription.
 */
function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Sets the Single Post blocks that the canvas marks.
 *
 * @param clientIds Client IDs of the blocks, or an empty array to mark no block.
 */
export function setHighlightedLayout(clientIds: string[]) {
  highlighted = clientIds;
  listeners.forEach((listener) => listener());
}

/**
 * Whether the canvas marks a Single Post block.
 *
 * @param clientId Client ID of the block.
 */
export function useIsLayoutHighlighted(clientId: string): boolean {
  return useSyncExternalStore(subscribe, () => highlighted.includes(clientId));
}
