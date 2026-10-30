// Global dependencies.
import React from 'react';

// WordPress dependencies.
import {
  // @ts-expect-error __experimentalBlockVariationPicker not available in types yet.
  __experimentalBlockVariationPicker as BlockVariationPicker,
  store as blockEditorStore,
} from '@wordpress/block-editor';
import {
  BlockVariation,
  InnerBlockTemplate,
  createBlocksFromInnerBlocksTemplate,
  store as blocksStore,
} from '@wordpress/blocks';
import { useDispatch, useSelect } from '@wordpress/data';

/**
 * A picker of the block's variations, which replaces the block's inner blocks with those of the
 * chosen variation, like the placeholder of core's Query block.
 */
export default function LayoutVariationPicker({
  blockProps,
  clientId,
  icon,
  instructions,
  label,
  name,
}: {
  blockProps: Record<string, unknown>;
  clientId: string;
  icon: unknown;
  instructions: string;
  label: string;
  name: string;
}) {
  const variations: BlockVariation[] = useSelect((select) => {
    const {
      getBlockVariations,
    } = select(blocksStore) as any;

    let out: BlockVariation[] = [];
    const found = getBlockVariations(name, 'block');

    if (Array.isArray(found)) {
      out = found;
    }

    return out;
  }, [name]);

  const {
    replaceInnerBlocks,
  } = useDispatch(blockEditorStore);

  return (
    <div {...blockProps}>
      <BlockVariationPicker
        icon={icon}
        instructions={instructions}
        label={label}
        onSelect={(variation: BlockVariation | undefined) => {
          if (variation !== undefined && Array.isArray(variation.innerBlocks)) {
            replaceInnerBlocks(
              clientId,
              createBlocksFromInnerBlocksTemplate(variation.innerBlocks as InnerBlockTemplate[]),
              false,
            );
          }
        }}
        variations={variations}
      />
    </div>
  );
}
