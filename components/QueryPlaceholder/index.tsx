/**
 * WordPress dependencies
 */
import { useSelect, useDispatch } from '@wordpress/data';
import {
  createBlocksFromInnerBlocksTemplate,
  store as blocksStore,
} from '@wordpress/blocks';
import { useState } from '@wordpress/element';
import {
  store as blockEditorStore,
  // @ts-expect-error: __experimentalBlockVariationPicker is not in @types/wordpress__block-editor
  __experimentalBlockVariationPicker as BlockVariationPicker,
  useBlockProps,
} from '@wordpress/block-editor';
import { Button, Placeholder } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useResizeObserver } from '@wordpress/compose';

/**
 * Internal dependencies
 */
import { BlockVariation } from '../../blocks/query/types';
import { useScopedBlockVariations } from '../../services/utils';
import { useBlockPatterns } from '../PatternSelectionModal';

interface QueryVariationPickerProps {
  clientId: string;
  attributes: Record<string, any>;
  icon: string | { src: string; foreground: string; background: string } | undefined;
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
                variation.innerBlocks,
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
  const [containerWidth, setContainerWidth] = useState(0);

  // Use ResizeObserver to monitor container width.
  const resizeObserverRef = useResizeObserver(([entry]) => {
    setContainerWidth(entry.contentRect.width);
  });

  const SMALL_CONTAINER_BREAKPOINT = 160;

  const isSmallContainer = containerWidth > 0 && containerWidth < SMALL_CONTAINER_BREAKPOINT;

  const { blockType, activeBlockVariation } = useSelect(
    (select) => {
      // @ts-expect-error
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
  const icon = activeBlockVariation?.icon?.src
    || activeBlockVariation?.icon
    || blockType?.icon?.src;
  const label = activeBlockVariation?.title || blockType?.title;
  const blockProps = useBlockProps({
    ref: resizeObserverRef,
  });

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
        icon={!isSmallContainer && icon}
        label={!isSmallContainer && label}
        instructions={
          !isSmallContainer
            ? __('Choose a pattern for the query or start blank.', 'wp-curate')
            : ''
        }
        withIllustration={isSmallContainer}
      >
        { !!hasPatterns && !isSmallContainer ? (
          <Button
            __next40pxDefaultSize
            variant="primary"
            onClick={openPatternSelectionModal}
          >
            {__('Choose', 'wp-curate')}
          </Button>
        ) : null }

        {!isSmallContainer ? (
          <Button
            __next40pxDefaultSize
            variant="secondary"
            onClick={() => {
              setIsStartingBlank(true);
            }}
          >
            { __('Start blank') }
          </Button>
        ) : null}
      </Placeholder>
    </div>
  );
}
