// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { store as blockEditorStore } from '@wordpress/block-editor';
import { BlockInstance, createBlock } from '@wordpress/blocks';
import { Button, Placeholder, Spinner } from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// Plugin dependencies.
import type { BlockPattern } from '../../query/types';

// Internal dependencies.
import toPatternBlocks from '../pattern-blocks';
import PatternSelectionModal from './pattern-selection-modal';

/**
 * The placeholder of a block without inner blocks, like the one of core's Query block. The user
 * chooses a pattern for the block, or starts blank with a Channel Loop block, which shows a picker
 * of layouts.
 *
 * A block that was just inserted uses its pattern without asking, if it has only one.
 *
 * Only patterns whose first block is a Channel Content block show, so that the block is always
 * replaced by another Channel Content block.
 */
export default function ChannelContentPlaceholder({
  blockProps,
  channel,
  clientId,
  icon,
  label,
  name,
}: {
  blockProps: Record<string, unknown>;
  channel: unknown;
  clientId: string;
  icon: unknown;
  label: string;
  name: string;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    allPatterns,
    isLoadingPatterns,
    wasJustInserted,
  }: {
    allPatterns: BlockPattern[];
    isLoadingPatterns: boolean;
    wasJustInserted: boolean;
  } = useSelect((select) => {
    const {
      getBlockRootClientId,
      getPatternsByBlockTypes,
      wasBlockJustInserted,
    } = select(blockEditorStore) as any;

    const {
      getBlockPatterns,
      hasFinishedResolution,
    } = select(coreStore) as any;

    // Start loading the patterns, if nothing else has.
    getBlockPatterns();

    return {
      allPatterns: getPatternsByBlockTypes(name, getBlockRootClientId(clientId)),
      // The editor gives no patterns until it loads them.
      isLoadingPatterns: !hasFinishedResolution('getBlockPatterns'),
      wasJustInserted: wasBlockJustInserted(clientId),
    };
  }, [clientId, name]);

  const {
    __unstableMarkNextChangeAsNotPersistent: markNextChangeAsNotPersistent,
    replaceBlock,
    replaceInnerBlocks,
    selectBlock,
  } = useDispatch(blockEditorStore) as any;

  const patterns = useMemo(
    () => allPatterns.filter(({
      blocks,
    }) => Array.isArray(blocks) && blocks.length > 0 && blocks[0].name === name),
    [allPatterns, name],
  );

  const isUsingOnlyPattern = wasJustInserted && !isLoadingPatterns && patterns.length === 1;

  useEffect(() => {
    if (isUsingOnlyPattern) {
      // The editor gives each pattern its parsed blocks.
      const newBlocks = toPatternBlocks(patterns[0].blocks as unknown as BlockInstance[], channel);

      // Part of the undo step of the insert.
      markNextChangeAsNotPersistent();
      replaceBlock(clientId, newBlocks);
      selectBlock(newBlocks[0].clientId);
    }
  }, [
    channel,
    clientId,
    isUsingOnlyPattern,
    markNextChangeAsNotPersistent,
    patterns,
    replaceBlock,
    selectBlock,
  ]);

  let out = (
    <div {...blockProps}>
      <Placeholder
        className="block-editor-media-placeholder"
        // @ts-expect-error The icon is a block type icon, which the types do not cover.
        icon={icon}
        instructions={__('Choose a pattern for the channel content or start blank.', 'wp-curate')}
        label={label}
      >
        {patterns.length > 0 ? (
          <Button
            __next40pxDefaultSize
            onClick={() => setIsModalOpen(true)}
            variant="primary"
          >
            {__('Choose', 'wp-curate')}
          </Button>
        ) : null}

        <Button
          __next40pxDefaultSize
          onClick={() => replaceInnerBlocks(clientId, [createBlock('wp-curate/channel-loop')], true)}
          variant="secondary"
        >
          {__('Start blank', 'wp-curate')}
        </Button>
      </Placeholder>

      {isModalOpen ? (
        <PatternSelectionModal
          channel={channel}
          clientId={clientId}
          onClose={() => setIsModalOpen(false)}
          patterns={patterns}
        />
      ) : null}
    </div>
  );

  // A block that was just inserted waits until it knows whether to use its only pattern.
  if (isUsingOnlyPattern || (wasJustInserted && isLoadingPatterns)) {
    out = (
      <div {...blockProps}>
        <Spinner />
      </div>
    );
  }

  return out;
}
