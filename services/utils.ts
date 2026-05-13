/**
 * WordPress dependencies
 *
 * Derived from WordPress Block Editor's Query block utils.
 * @link https://github.com/WordPress/gutenberg/blob/trunk/packages/block-library/src/query/utils.js
 */

import apiFetch from '@wordpress/api-fetch';
import { useSelect } from '@wordpress/data';
import { useMemo } from '@wordpress/element';
import { store as blockEditorStore } from '@wordpress/block-editor';
import {
  cloneBlock,
  store as blocksStore,
} from '@wordpress/blocks';
import { addQueryArgs } from '@wordpress/url';

import type { Block, BlockVariation } from '@wordpress/blocks';
import type { BlockPattern } from '../blocks/query/types';

/**
 * Clones a pattern's blocks.
 *
 * Returns the cloned blocks and array of existing Query
 * client ids for further manipulation, in order to avoid multiple recursions.
 *
 * @param {WPBlock[]}        blocks               The list of blocks to look
 *                                                through and transform(mutate).
 * @param {Record<string,*>} queryBlockAttributes The existing Query's attributes.
 * @return {{ newBlocks: WPBlock[], queryClientIds: string[] }} An object with the
 *                                                cloned/transformed blocks and all
 *                                                the Query clients from these blocks.
 */
export const getTransformedBlocksFromPattern = (
  blocks: Block[],
  queryBlockAttributes: Record<string, any>,
) => {
  const {
    namespace,
  } = queryBlockAttributes;
  const clonedBlocks = blocks.map((block: Block) => cloneBlock(block));
  const queryClientIds = [];
  const blocksQueue = [...clonedBlocks];
  while (blocksQueue.length > 0) {
    const block = blocksQueue.shift();
    if (block?.name === 'wp-curate/query') {
      if (namespace) {
        block.attributes.namespace = namespace;
      }
      queryClientIds.push(block.clientId);
    }
    block?.innerBlocks?.forEach((innerBlock: Block) => {
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
 * for Query.
 *
 * If there are no such patterns, the default ones for Query are going
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
 * the default ones for Query.
 *
 * If there are no such scoped `block` variations, the default ones for Query
 * Loop are going to be suggested.
 *
 * The way we determine such variations is with the convention that they have the `namespace`
 * attribute defined as an array. This array should contain the names(`name` property) of any
 * variations they want to be connected to.
 * For example, if we have a `Query` scoped `inserter` variation with the name `products`,
 * we can connect a scoped `block` variation by setting its `namespace` attribute to `['products']`.
 * If the user selects this variation, the `namespace` attribute will be overridden by the
 * main `inserter` variation.
 *
 * @param {Object} attributes The block's attributes.
 * @return {BlockVariation[]} The block variations to be suggested in setup flow,
 * when clicking to `start blank`.
 */
export function useScopedBlockVariations(attributes: Record<string, any>) {
  const { activeVariationName, blockVariations } = useSelect(
    (select) => {
      const { getActiveBlockVariation, getBlockVariations } = select(blocksStore);
      return {
        activeVariationName: getActiveBlockVariation(
          'wp-curate/query',
          attributes,
        )?.name,
        blockVariations: getBlockVariations('wp-curate/query', 'block') ?? [],
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
      (variation: BlockVariation) => (variation.attributes?.namespace as string[] | undefined)?.includes(activeVariationName),
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
export const usePatterns = (clientId: string, name: string): BlockPattern[] => useSelect(
  (select) => {
    // @ts-expect-error
    const { getBlockRootClientId, getPatternsByBlockTypes } = select(blockEditorStore);
    const rootClientId = getBlockRootClientId(clientId);
    return getPatternsByBlockTypes(name, rootClientId);
  },
  [name, clientId],
);

/**
 * Custom function for use with usePostById to get the post type that includes scheduled posts.
 *
 * @param {number} postId The post ID.
 * @return {Promise<string|null>} The post type or null if not found.
 */
export const postTypeWithFuture = async (postId: number) => {
  let type = null;

  const path = addQueryArgs('/wp/v2/search', {
    include: postId,
    wp_curate_include_future: 1,
  });

  const results = await apiFetch({ path });

  if (
    Array.isArray(results)
    && results.length > 0
    && typeof results[0] === 'object'
    && results[0] !== null
    && 'subtype' in results[0]
  ) {
    type = results[0].subtype;
  }

  return type;
};
