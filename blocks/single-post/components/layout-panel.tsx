// Global dependencies.
import classnames from 'classnames';
import React from 'react';

// WordPress dependencies.
import {
  // @ts-expect-error BlockContextProvider not available in types yet.
  BlockContextProvider,
  // @ts-expect-error BlockPreview not available in types yet.
  BlockPreview,
  InspectorControls,
  store as blockEditorStore,
} from '@wordpress/block-editor';
import {
  BlockInstance,
  BlockVariation,
  InnerBlockTemplate,
  createBlocksFromInnerBlocksTemplate,
  store as blocksStore,
} from '@wordpress/blocks';
import { PanelBody } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useMemo } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

// Plugin dependencies.
import toInnerBlockTemplate from '../../../services/innerBlockTemplate';

// The width, in pixels, at which the previews render before they are scaled to fit.
const PREVIEW_WIDTH = 400;

// No variations.
const NO_VARIATIONS: BlockVariation[] = [];

/**
 * Compares blocks by name, attributes, and inner blocks, not by client ID.
 *
 * @param blocks Blocks.
 */
function toLayoutKey(blocks: BlockInstance[]): string {
  return JSON.stringify(toInnerBlockTemplate(blocks));
}

/**
 * A preview of a layout variation, with its title.
 *
 * A card with `onSelect` is a button. The current layout of the block has no `onSelect`, because
 * a click would change nothing.
 */
function LayoutCard({
  blocks,
  caption,
  isCurrent,
  label,
  onSelect,
  previewContext,
}: {
  blocks: BlockInstance[];
  caption: string;
  isCurrent: boolean;
  label: string;
  onSelect: (() => void) | null;
  previewContext: Record<string, unknown>;
}) {
  return (
    <div className={classnames('wp-curate-layout-card', { 'is-current': isCurrent })}>
      <div className="wp-curate-layout-card__preview" aria-hidden="true">
        {/*
          * The blocks in the preview show the post of the Single Post block. Without a post, they
          * show placeholders. They must not get the post that the editor edits, which is the
          * context around the block.
          */}
        <BlockContextProvider value={previewContext}>
          <BlockPreview blocks={blocks} viewportWidth={PREVIEW_WIDTH} />
        </BlockContextProvider>
      </div>
      {onSelect !== null ? (
        <button
          aria-label={label}
          className="wp-curate-layout-card__button"
          onClick={onSelect}
          type="button"
        >
          {caption}
        </button>
      ) : (
        <span className="wp-curate-layout-card__caption">
          {caption}
        </span>
      )}
    </div>
  );
}

/**
 * The "Single Post Layout" panel in the Styles tab of the block sidebar.
 *
 * It shows a preview of each variation of the block. A click replaces the inner blocks of the
 * block. The variation that matches the inner blocks is marked, and is not a button.
 */
export default function LayoutPanel({
  clientId,
  name,
  postId,
  postType,
}: {
  clientId: string;
  name: string;
  postId: number | null;
  postType: string;
}) {
  const {
    replaceInnerBlocks,
  } = useDispatch(blockEditorStore);

  const {
    currentBlocks,
    variations,
  } = useSelect((select) => {
    const {
      getBlocks,
    } = select(blockEditorStore) as any;

    const {
      getBlockVariations,
    } = select(blocksStore) as any;

    let found = getBlockVariations(name, 'block');

    if (!Array.isArray(found)) {
      found = NO_VARIATIONS;
    }

    return {
      currentBlocks: getBlocks(clientId) as BlockInstance[],
      variations: found as BlockVariation[],
    };
  }, [clientId, name]);

  const currentKey = useMemo(() => toLayoutKey(currentBlocks), [currentBlocks]);

  const variationLayouts = useMemo(() => variations.map((variation) => {
    let blocks: BlockInstance[] = [];

    if (Array.isArray(variation.innerBlocks)) {
      blocks = createBlocksFromInnerBlocksTemplate(variation.innerBlocks as InnerBlockTemplate[]);
    }

    return {
      blocks,
      key: toLayoutKey(blocks),
      variation,
    };
  }), [variations]);

  const previewContext = useMemo(() => {
    if (postId !== null && postId > 0) {
      return { postId, postType };
    }

    return { postId: undefined, postType: undefined };
  }, [postId, postType]);

  if (variationLayouts.length === 0) {
    return null;
  }

  return (
    <InspectorControls group="styles">
      <PanelBody title={__('Single Post Layout', 'wp-curate')}>
        <div className="wp-curate-layout-panel__cards">
          {variationLayouts.map(({ blocks, key, variation }) => {
            const isCurrent = key === currentKey;

            return (
              <LayoutCard
                blocks={blocks}
                caption={variation.title}
                isCurrent={isCurrent}
                key={variation.name}
                label={sprintf(
                  /* translators: %s: The name of the layout, such as "Title & Date". */
                  __('Use the %s layout', 'wp-curate'),
                  variation.title,
                )}
                onSelect={isCurrent ? null : () => replaceInnerBlocks(
                  clientId,
                  createBlocksFromInnerBlocksTemplate(
                    variation.innerBlocks as InnerBlockTemplate[],
                  ),
                  false,
                )}
                previewContext={previewContext}
              />
            );
          })}
        </div>
      </PanelBody>
    </InspectorControls>
  );
}
