import { useBlockProps, store as blockEditorStore, __experimentalBlockVariationPicker } from '@wordpress/block-editor';
import { useDispatch, dispatch, select } from '@wordpress/data';
import { createBlocksFromInnerBlocksTemplate } from '@wordpress/blocks';
import { blockTable } from '@wordpress/icons';
import { __ } from '@wordpress/i18n';

import useScopedBlockVariations from '../../services/useScopedBlockVariations';

interface QueryVariationPickerProps {
  clientId: string;
  attributes: Record<string, any>;
}

export default function QueryVariationPicker(
  {
    clientId,
    attributes,
  }: QueryVariationPickerProps,
) {
  const scopeVariations = useScopedBlockVariations(attributes);
  const { replaceInnerBlocks } = useDispatch(blockEditorStore);
  const blockProps = useBlockProps();
  return (
    <div {...blockProps}>
      <__experimentalBlockVariationPicker // eslint-disable-line react/jsx-pascal-case
        icon={blockTable}
        label={__('Choose a layout', 'wp-curate')}
        variations={scopeVariations}
        onSelect={(variation) => {
          if (variation.innerBlocks) {
            replaceInnerBlocks(
              clientId,
              createBlocksFromInnerBlocksTemplate(
                variation.innerBlocks,
              ),
              false,
            );
          }
          if (variation.attributes) {
            dispatch(blockEditorStore).updateBlockAttributes(clientId, {
              layout: variation.attributes.layout,
            });
          }
        }}
      />
    </div>
  );
}
