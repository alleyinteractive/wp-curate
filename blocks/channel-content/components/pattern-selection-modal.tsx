// Global dependencies.
import React from 'react';

// WordPress dependencies.
import {
  // @ts-expect-error __experimentalBlockPatternsList not available in types yet.
  __experimentalBlockPatternsList as BlockPatternsList,
  store as blockEditorStore,
} from '@wordpress/block-editor';
import { BlockInstance } from '@wordpress/blocks';
import { Modal, SearchControl } from '@wordpress/components';
import { useDispatch } from '@wordpress/data';
import { useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// Plugin dependencies.
import type { BlockPattern } from '../../query/types';
import { searchPatterns } from '../../../components/PatternSelectionModal/searchPatterns';

// Internal dependencies.
import toPatternBlocks from '../pattern-blocks';

/**
 * A modal of the block's patterns, like the one of core's Query block. The chosen pattern replaces
 * the block.
 *
 * The new Channel Content block keeps the channel of the block that it replaces, unless the
 * pattern gives it a channel.
 */
export default function PatternSelectionModal({
  channel,
  clientId,
  onClose,
  patterns,
}: {
  channel: unknown;
  clientId: string;
  onClose: () => void;
  patterns: BlockPattern[];
}) {
  const [searchValue, setSearchValue] = useState('');

  const {
    replaceBlock,
    selectBlock,
  } = useDispatch(blockEditorStore);

  const filteredPatterns = useMemo(
    () => searchPatterns(patterns, searchValue),
    [patterns, searchValue],
  );

  /**
   * Replaces the block with the blocks of the pattern.
   *
   * @param pattern The pattern.
   * @param blocks  The blocks of the pattern.
   */
  const onClickPattern = (pattern: BlockPattern, blocks: BlockInstance[]) => {
    const newBlocks = toPatternBlocks(blocks, channel);

    replaceBlock(clientId, newBlocks);
    selectBlock(newBlocks[0].clientId);
  };

  return (
    <Modal
      isFullScreen
      onRequestClose={onClose}
      overlayClassName="block-library-query-pattern__selection-modal"
      title={__('Choose a pattern', 'wp-curate')}
    >
      <div className="block-library-query-pattern__selection-content">
        <div className="block-library-query-pattern__selection-search">
          <SearchControl
            __nextHasNoMarginBottom
            label={__('Search', 'wp-curate')}
            onChange={setSearchValue}
            placeholder={__('Search', 'wp-curate')}
            value={searchValue}
          />
        </div>
        <BlockPatternsList
          blockPatterns={filteredPatterns}
          onClickPattern={onClickPattern}
        />
      </div>
    </Modal>
  );
}
