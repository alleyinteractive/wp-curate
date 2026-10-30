// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { store as blockEditorStore } from '@wordpress/block-editor';
import { Button, Placeholder } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// Plugin dependencies.
import LayoutVariationPicker from '../../../components/LayoutVariationPicker';
import type { BlockPattern } from '../../query/types';

// Internal dependencies.
import PatternSelectionModal from './pattern-selection-modal';

/**
 * The placeholder of a block without inner blocks, like the one of core's Query block. The user
 * chooses a pattern for the block, or starts blank with a picker of layouts for each post.
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
  const [isStartingBlank, setIsStartingBlank] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const allPatterns: BlockPattern[] = useSelect((select) => {
    const {
      getBlockRootClientId,
      getPatternsByBlockTypes,
    } = select(blockEditorStore) as any;

    return getPatternsByBlockTypes(name, getBlockRootClientId(clientId));
  }, [clientId, name]);

  const patterns = useMemo(
    () => allPatterns.filter(({
      blocks,
    }) => Array.isArray(blocks) && blocks.length > 0 && blocks[0].name === name),
    [allPatterns, name],
  );

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
          onClick={() => setIsStartingBlank(true)}
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

  if (isStartingBlank) {
    out = (
      <LayoutVariationPicker
        blockProps={blockProps}
        clientId={clientId}
        icon={icon}
        instructions={__('Choose a layout for each post.', 'wp-curate')}
        label={label}
        name={name}
      />
    );
  }

  return out;
}
