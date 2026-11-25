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
import { Button, PanelBody } from '@wordpress/components';
import { useDispatch, useRegistry, useSelect } from '@wordpress/data';
import { useEffect, useMemo, useRef } from '@wordpress/element';
import { _n, __, sprintf } from '@wordpress/i18n';

// Plugin dependencies.
import toInnerBlockTemplate from '../../../services/innerBlockTemplate';
import joinLayoutGroup from '../../../services/joinLayoutGroup';
import {
  LayoutChoice,
  SINGLE_POST_BLOCK,
  layoutChoicesOf,
  layoutGroupMembers,
} from '../../../services/layoutGroups';
import { SyncLayoutsRegistry } from '../../../services/syncLayouts';

// Internal dependencies.
import { setHighlightedLayout } from '../layout-highlight';

// The width, in pixels, at which the previews render before they are scaled to fit.
const PREVIEW_WIDTH = 400;

// No variations.
const NO_VARIATIONS: BlockVariation[] = [];

// No blocks to mark in the canvas.
const NO_BLOCKS: string[] = [];

/**
 * Compares blocks by name, attributes, and inner blocks, not by client ID.
 *
 * @param blocks Blocks.
 */
function toLayoutKey(blocks: BlockInstance[]): string {
  return JSON.stringify(toInnerBlockTemplate(blocks));
}

/**
 * A preview of a layout, with a caption.
 *
 * A card with `onSelect` is a button. The current layout of the block has no `onSelect`, because
 * a click would change nothing. While the user points to the card or focuses it, the canvas marks
 * the blocks in `highlightIds`.
 */
function LayoutCard({
  blocks,
  caption,
  highlightIds,
  isCurrent,
  label,
  onSelect,
  previewContext,
}: {
  blocks: BlockInstance[];
  caption: string;
  highlightIds: string[];
  isCurrent: boolean;
  label: string;
  onSelect: (() => void) | null;
  previewContext: Record<string, unknown>;
}) {
  // Whether this card set the marked blocks, so that it clears them when it goes away.
  const isHighlighting = useRef(false);

  const highlight = () => {
    if (highlightIds.length > 0) {
      isHighlighting.current = true;
      setHighlightedLayout(highlightIds);
    }
  };

  const unhighlight = () => {
    if (isHighlighting.current) {
      isHighlighting.current = false;
      setHighlightedLayout(NO_BLOCKS);
    }
  };

  // A card can go away while the user points to it, such as after a click that joins its group.
  useEffect(() => () => {
    if (isHighlighting.current) {
      setHighlightedLayout(NO_BLOCKS);
    }
  }, []);

  return (
    <div
      className={classnames('wp-curate-layout-card', { 'is-current': isCurrent })}
      onMouseEnter={highlight}
      onMouseLeave={unhighlight}
    >
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
          onBlur={unhighlight}
          onClick={onSelect}
          onFocus={highlight}
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
 * The card of the layout of some Single Post blocks. The inner blocks of the first block are the
 * preview.
 */
function LayoutChoiceCard({
  choice,
  clientId,
  onSelect,
  previewContext,
}: {
  choice: LayoutChoice;
  clientId: string;
  onSelect: (() => void) | null;
  previewContext: Record<string, unknown>;
}) {
  const {
    members,
  } = choice;

  const blocks: BlockInstance[] = useSelect(
    (select) => (select(blockEditorStore) as any).getBlocks(members[0]),
    [members],
  );

  const count = members.length;
  const isCurrent = members.includes(clientId);

  let caption = sprintf(
    /* translators: %d: The number of Single Post blocks. */
    _n('%d block', '%d blocks', count, 'wp-curate'),
    count,
  );

  if (isCurrent && count === 1) {
    caption = __('This block', 'wp-curate');
  } else if (isCurrent) {
    caption = sprintf(
      /* translators: %d: The number of other Single Post blocks. */
      _n('This block and %d other', 'This block and %d others', count - 1, 'wp-curate'),
      count - 1,
    );
  }

  return (
    <LayoutCard
      blocks={blocks}
      caption={caption}
      highlightIds={members}
      isCurrent={isCurrent}
      label={sprintf(
        /* translators: %d: The number of Single Post blocks. */
        _n('Use the layout of %d block', 'Use the layout of %d blocks', count, 'wp-curate'),
        count,
      )}
      onSelect={onSelect}
      previewContext={previewContext}
    />
  );
}

/**
 * The "Single Post Layout" panel in the Styles tab of the block sidebar.
 *
 * - When the block shares its layout, the panel tells with how many other Single Post blocks, and
 *   it has a button that detaches the block from them.
 * - "Layouts in this post" shows a preview of the layout of each group of Single Post blocks in
 *   the same entity, and of each Single Post that is not in a group. See `layoutChoicesOf()`. A
 *   click on a preview puts the block in that group and gives it the layout. A preview of a block
 *   that is not in a group makes a new group of the two blocks.
 * - "Layout variations" shows the variations of the block. A click replaces the inner blocks of the
 *   block. If the block is in a group, the sync then gives the new layout to the whole group.
 *
 * The panel always has the variations, so that the Styles tab does not appear and disappear while
 * the user works.
 */
export default function SharedLayoutPanel({
  clientId,
  onDetach,
  postId,
  postType,
}: {
  clientId: string;
  onDetach: () => void;
  postId: number | null;
  postType: string;
}) {
  // `useRegistry` is typed as returning `Function`.
  const registry = useRegistry() as unknown as SyncLayoutsRegistry;

  const {
    replaceInnerBlocks,
  } = useDispatch(blockEditorStore);

  // A string, so that the result is the same when the choices are the same.
  const choicesJson: string = useSelect(
    (select) => JSON.stringify(layoutChoicesOf(select(blockEditorStore), clientId)),
    [clientId],
  );

  const choices: LayoutChoice[] = useMemo(() => JSON.parse(choicesJson), [choicesJson]);

  const {
    currentBlocks,
    otherCount,
    variations,
  } = useSelect((select) => {
    const {
      getBlocks,
    } = select(blockEditorStore) as any;

    const {
      getBlockVariations,
    } = select(blocksStore) as any;

    let found = getBlockVariations(SINGLE_POST_BLOCK, 'block');

    if (!Array.isArray(found)) {
      found = NO_VARIATIONS;
    }

    return {
      currentBlocks: getBlocks(clientId) as BlockInstance[],
      otherCount: Math.max(0, layoutGroupMembers(select(blockEditorStore), clientId).length - 1),
      variations: found as BlockVariation[],
    };
  }, [clientId]);

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

  const currentChoice = choices.find(({ members }) => members.includes(clientId));
  const otherChoices = choices.filter(({ members }) => !members.includes(clientId));

  // A choice without a key has one block, which gets a new key with this block.
  const join = ({ members }: LayoutChoice) => joinLayoutGroup(registry, members[0], [clientId]);

  return (
    <InspectorControls group="styles">
      <PanelBody title={__('Single Post Layout', 'wp-curate')}>
        {otherCount > 0 ? (
          <div className="wp-curate-layout-panel__section">
            <p>
              {sprintf(
                /* translators: %d: The number of other Single Post blocks. */
                _n(
                  'This Single Post block shares its layout with %d other block. A change to the layout of one changes the layout of all.',
                  'This Single Post block shares its layout with %d other blocks. A change to the layout of one changes the layout of all.',
                  otherCount,
                  'wp-curate',
                ),
                otherCount,
              )}
            </p>
            <Button variant="secondary" onClick={onDetach}>
              {__('Detach layout', 'wp-curate')}
            </Button>
          </div>
        ) : null}

        {otherChoices.length > 0 ? (
          <div className="wp-curate-layout-panel__section">
            <h3 className="wp-curate-layout-panel__heading">
              {__('Layouts in this post', 'wp-curate')}
            </h3>
            <p className="wp-curate-layout-panel__help">
              {__('Select a layout to share it with this block. Blocks in this post that share a layout stay the same when you change one of them.', 'wp-curate')}
            </p>
            <div className="wp-curate-layout-panel__cards">
              {currentChoice !== undefined ? (
                <LayoutChoiceCard
                  choice={currentChoice}
                  clientId={clientId}
                  onSelect={null}
                  previewContext={previewContext}
                />
              ) : null}
              {otherChoices.map((choice) => (
                <LayoutChoiceCard
                  choice={choice}
                  clientId={clientId}
                  key={choice.members[0]}
                  onSelect={() => join(choice)}
                  previewContext={previewContext}
                />
              ))}
            </div>
          </div>
        ) : null}

        {variationLayouts.length > 0 ? (
          <div className="wp-curate-layout-panel__section">
            <h3 className="wp-curate-layout-panel__heading">
              {__('Layout variations', 'wp-curate')}
            </h3>
            {otherCount > 0 ? (
              <p className="wp-curate-layout-panel__help">
                {sprintf(
                  /* translators: %d: The number of other Single Post blocks. */
                  _n(
                    'A variation replaces the layout of this block and of the %d other block that shares it.',
                    'A variation replaces the layout of this block and of the %d other blocks that share it.',
                    otherCount,
                    'wp-curate',
                  ),
                  otherCount,
                )}
              </p>
            ) : null}
            <div className="wp-curate-layout-panel__cards">
              {variationLayouts.map(({ blocks, key, variation }) => {
                const isCurrent = key === currentKey;

                return (
                  <LayoutCard
                    blocks={blocks}
                    caption={variation.title}
                    highlightIds={NO_BLOCKS}
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
          </div>
        ) : null}
      </PanelBody>
    </InspectorControls>
  );
}
