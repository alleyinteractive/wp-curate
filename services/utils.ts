/**
 * WordPress dependencies
 */
import { useSelect } from '@wordpress/data';
import { useMemo } from '@wordpress/element';
import { store as blockEditorStore } from '@wordpress/block-editor';
import {
  cloneBlock,
  store as blocksStore,
} from '@wordpress/blocks';

import type { BlockInstance } from 'wordpress__blocks';
import type { BlockVariation } from '../blocks/query/types';

/** @typedef {import('@wordpress/blocks').WPBlockVariation} WPBlockVariation */
/** @typedef {import('@wordpress/components/build-types/query-controls/types').OrderByOption} OrderByOption */ // eslint-disable-line max-len

/**
 * @typedef IHasNameAndId
 * @property {string|number} id   The entity's id.
 * @property {string}        name The entity's name.
 */

/**
 * The object used in Query block that contains info and helper mappings
 * from an array of IHasNameAndId objects.
 *
 * @typedef {Object} QueryEntitiesInfo
 * @property {IHasNameAndId[]}               entities  The array of entities.
 * @property {Object<string, IHasNameAndId>} mapById   Object mapping with the id as
 *                                                     key and the entity as value.
 * @property {Object<string, IHasNameAndId>} mapByName Object mapping with the name as
 *                                                     key and the entity as value.
 * @property {string[]}                      names     Array with the entities' names.
 */

/**
 * Clones a pattern's blocks and then recurses over that list of blocks,
 * transforming them to retain some `query` attribute properties.
 * For now we retain the `postType` and `inherit` properties as they are
 * fundamental for the expected functionality of the block and don't affect
 * its design and presentation.
 *
 * Returns the cloned/transformed blocks and array of existing Query Loop
 * client ids for further manipulation, in order to avoid multiple recursions.
 *
 * @param {WPBlock[]}        blocks               The list of blocks to look
 *                                                through and transform(mutate).
 * @param {Record<string,*>} queryBlockAttributes The existing Query Loop's attributes.
 * @return {{ newBlocks: WPBlock[], queryClientIds: string[] }} An object with the
 *                                                cloned/transformed blocks and all
 *                                                the Query Loop clients from these blocks.
 */
export const getTransformedBlocksFromPattern = (
  blocks: BlockInstance[],
  queryBlockAttributes: Record<string, any>,
) => {
  const {
    query: { postType, inherit },
    namespace,
  } = queryBlockAttributes;
  const clonedBlocks = blocks.map((block: BlockInstance) => cloneBlock(block));
  const queryClientIds = [];
  const blocksQueue = [...clonedBlocks];
  while (blocksQueue.length > 0) {
    const block = blocksQueue.shift();
    if (block?.name === 'wp-curate/query') {
      block.attributes.query = {
        ...block.attributes.query,
        postType,
        inherit,
      };
      if (namespace) {
        block.attributes.namespace = namespace;
      }
      queryClientIds.push(block.clientId);
    }
    block?.innerBlocks?.forEach((innerBlock: BlockInstance) => {
      blocksQueue.push(innerBlock);
    });
  }
  return { newBlocks: clonedBlocks, queryClientIds };
};

/**
 * Helper hook that determines if there is an active variation of the block
 * and if there are available specific patterns for this variation.
 * If there are, these patterns are going to be the only ones suggested to
 * the user in setup and replace flow, without including the default ones
 * for Query Loop.
 *
 * If there are no such patterns, the default ones for Query Loop are going
 * to be suggested.
 *
 * @param {string} clientId   The block's client ID.
 * @param {Object} attributes The block's attributes.
 * @return {string} The block name to be used in the patterns suggestions.
 */
export function useBlockNameForPatterns(clientId: string, attributes: Record<string, any>) {
  return useSelect(
    (select) => {
      const activeVariationName = select(
        blocksStore,
        // @ts-expect-error
      ).getActiveBlockVariation('wp-curate/query', attributes)?.name;

      if (!activeVariationName) {
        return 'wp-curate/query';
      }

      // @ts-expect-error
      const { getBlockRootClientId, getPatternsByBlockTypes } = select(blockEditorStore);

      const rootClientId = getBlockRootClientId(clientId);
      const activePatterns = getPatternsByBlockTypes(
        `wp-curate/query/${activeVariationName}`,
        rootClientId,
      );

      return activePatterns.length > 0
        ? `wp-curate/query/${activeVariationName}`
        : 'wp-curate/query';
    },
    [clientId, attributes],
  );
}

/**
 * Helper hook that determines if there is an active variation of the block
 * and if there are available specific scoped `block` variations connected with
 * this variation.
 *
 * If there are, these variations are going to be the only ones suggested
 * to the user in setup flow when clicking to `start blank`, without including
 * the default ones for Query Loop.
 *
 * If there are no such scoped `block` variations, the default ones for Query
 * Loop are going to be suggested.
 *
 * The way we determine such variations is with the convention that they have the `namespace`
 * attribute defined as an array. This array should contain the names(`name` property) of any
 * variations they want to be connected to.
 * For example, if we have a `Query Loop` scoped `inserter` variation with the name `products`,
 * we can connect a scoped `block` variation by setting its `namespace` attribute to `['products']`.
 * If the user selects this variation, the `namespace` attribute will be overridden by the
 * main `inserter` variation.
 *
 * @param {Object} attributes The block's attributes.
 * @return {WPBlockVariation[]} The block variations to be suggested in setup flow,
 * when clicking to `start blank`.
 */
export function useScopedBlockVariations(attributes: Record<string, any>) {
  const { activeVariationName, blockVariations } = useSelect(
    (select) => {
      // @ts-expect-error
      const { getActiveBlockVariation, getBlockVariations } = select(blocksStore);
      return {
        activeVariationName: getActiveBlockVariation(
          'wp-curate/query',
          attributes,
        )?.name,
        blockVariations: getBlockVariations('wp-curate/query', 'block'),
      };
    },
    [attributes],
  );
  const variations = useMemo(() => {
    // Filter out the variations that have defined a `namespace` attribute,
    // which means they are 'connected' to specific variations of the block.
    const isNotConnected = (variation: BlockVariation) => !variation.attributes?.namespace;
    if (!activeVariationName) {
      return blockVariations.filter(isNotConnected);
    }
    const connectedVariations = blockVariations.filter(
      (variation: BlockVariation) => variation.attributes?.namespace?.includes(activeVariationName),
    );
    if (connectedVariations.length) {
      return connectedVariations;
    }
    return blockVariations.filter(isNotConnected);
  }, [activeVariationName, blockVariations]);
  return variations;
}

/**
 * Hook that returns the block patterns for a specific block type.
 *
 * @param {string} clientId The block's client ID.
 * @param {string} name     The block type name.
 * @return {Object[]} An array of valid block patterns.
 */
export const usePatterns = (clientId: string, name: string) => useSelect(
  (select) => {
    // @ts-expect-error
    const { getBlockRootClientId, getPatternsByBlockTypes } = select(blockEditorStore);
    const rootClientId = getBlockRootClientId(clientId);
    return getPatternsByBlockTypes(name, rootClientId);
  },
  [name, clientId],
);

/**
 * The object returned by useUnsupportedBlocks with info about the type of
 * unsupported blocks present inside the Query block.
 *
 * @typedef  {Object}  UnsupportedBlocksInfo
 * @property {boolean} hasBlocksFromPlugins True if blocks from plugins are present.
 * @property {boolean} hasPostContentBlock  True if a 'core/post-content' block is present.
 * @property {boolean} hasUnsupportedBlocks True if there are any unsupported blocks.
 */
