/**
 * WordPress dependencies
 */
import { useSelect, useDispatch } from '@wordpress/data';
import {
  createBlocksFromInnerBlocksTemplate,
  store as blocksStore,
  Block,
  BlockVariation,
  BlockTypeIconDescriptor,
} from '@wordpress/blocks';
import { useState } from '@wordpress/element';
import {
  store as blockEditorStore,
  // @ts-expect-error: __experimentalBlockVariationPicker is not in @types/wordpress__block-editor
  __experimentalBlockVariationPicker as BlockVariationPicker,
  useBlockProps,
} from '@wordpress/block-editor';
import { Button, Placeholder, type IconType } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { useScopedBlockVariations } from '../../services/utils';
import { useBlockPatterns } from '../PatternSelectionModal';

interface QueryVariationPickerProps {
  clientId: string;
  attributes: Record<string, any>;
  icon: IconType | undefined;
  label: string | undefined;
}

function QueryVariationPicker({
  clientId,
  attributes,
  icon,
  label,
}: QueryVariationPickerProps) {
  const scopeVariations = useScopedBlockVariations(attributes);
  const { replaceInnerBlocks } = useDispatch(blockEditorStore);
  const blockProps = useBlockProps();
  return (
    <div {...blockProps}>
      <BlockVariationPicker
        icon={icon}
        label={label}
        variations={scopeVariations}
        onSelect={(variation: BlockVariation) => {
          if (variation.innerBlocks) {
            replaceInnerBlocks(
              clientId,
              createBlocksFromInnerBlocksTemplate(
                variation.innerBlocks as Array<Block | [string, Record<string, unknown>?, Array<unknown>?]>,
              ),
              false,
            );
          }
        }}
      />
    </div>
  );
}

interface QueryPlaceholderProps {
  attributes: Record<string, any>;
  clientId: string;
  name: string;
  openPatternSelectionModal: () => void;
}

export default function QueryPlaceholder({
  attributes,
  clientId,
  name,
  openPatternSelectionModal,
}: QueryPlaceholderProps) {
  const [isStartingBlank, setIsStartingBlank] = useState(false);

  const { blockType, activeBlockVariation } = useSelect(
    (select) => {
      const { getActiveBlockVariation, getBlockType } = select(blocksStore);
      return {
        blockType: getBlockType(name),
        activeBlockVariation: getActiveBlockVariation(
          name,
          attributes,
        ),
      };
    },
    [name, attributes],
  );
  const hasPatterns = !!useBlockPatterns(clientId, attributes).length;
  const icon = (
    (activeBlockVariation?.icon as BlockTypeIconDescriptor | undefined)?.src
    || activeBlockVariation?.icon
    || blockType?.icon?.src
  ) as IconType | undefined;
  const label = activeBlockVariation?.title || blockType?.title;
  const blockProps = useBlockProps();

  if (isStartingBlank) {
    return (
      <QueryVariationPicker
        clientId={clientId}
        attributes={attributes}
        icon={icon}
        label={label}
      />
    );
  }

  return (
    <div {...blockProps}>
      <Placeholder
        className="block-editor-media-placeholder"
        icon={icon}
        label={label}
        instructions={__('Choose a pattern for the query or start blank.', 'wp-curate')}
      >
        { hasPatterns ? (
          <Button
            __next40pxDefaultSize
            variant="primary"
            onClick={openPatternSelectionModal}
          >
            {__('Choose', 'wp-curate')}
          </Button>
        ) : null }

        <Button
          __next40pxDefaultSize
          variant="secondary"
          onClick={() => {
            setIsStartingBlank(true);
          }}
        >
          { __('Start blank', 'wp-curate') }
        </Button>
      </Placeholder>
    </div>
  );
}
