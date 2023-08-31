import { store } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';

interface CoreEditor {
  getBlock: (attribute: string) => object;
  getBlockRootClientId: (attribute: string) => string;
}

/**
 * Gets the parent block object for a specific block.
 *
 * @param {string} clientId The block client ID.
 * @returns {array} The parent block attributes.
 */
const useParentBlock = (clientId: string) => useSelect(
  (select) => {
    const {
      getBlock,
      getBlockRootClientId,
    } = select(store) as CoreEditor;

    // Get parent block client ID.
    const rootBlockClientId = getBlockRootClientId(clientId);

    if (!rootBlockClientId) {
      return null;
    }

    // Get parent block attributes.
    return getBlock(rootBlockClientId);
  },
  [clientId],
);

export default useParentBlock;
