/**
 * WordPress dependencies
 */
import { useState, useMemo } from '@wordpress/element';
import { useDispatch } from '@wordpress/data';
import { Modal, SearchControl } from '@wordpress/components';
import {
  // @ts-expect-error: BlockContextProvider is not yet typed in @types/wordpress__block-editor
  BlockContextProvider,
  store as blockEditorStore,
  // @ts-expect-error: __experimentalBlockPatternsList is not yet in @types/wordpress__block-editor
  __experimentalBlockPatternsList as BlockPatternsList,
} from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

import type { BlockInstance } from 'wordpress__blocks';
import type { BlockPattern } from '../../blocks/query/types';

/**
 * Internal dependencies
 */
import {
  useBlockNameForPatterns,
  getTransformedBlocksFromPattern,
  usePatterns,
} from '../../services/utils';
import { searchPatterns } from './searchPatterns';

export function useBlockPatterns(clientId: string, attributes: Record<string, any>) {
  const blockNameForPatterns = useBlockNameForPatterns(
    clientId,
    attributes,
  );
  const allPatterns = usePatterns(clientId, blockNameForPatterns);
  // Filter out any patterns that don't have Query as their root block
  // so that a Query block is always replaced by another Query block.
  const rootBlockPatterns = useMemo(
    () => allPatterns.filter(
      (pattern: BlockPattern) => pattern.blocks?.[0]?.name === blockNameForPatterns,
    ),
    [allPatterns, blockNameForPatterns],
  );

  return rootBlockPatterns;
}

interface PatternSelectionProps {
  clientId: string;
  attributes: Record<string, any>;
  showTitlesAsTooltip?: boolean;
  showSearch?: boolean;
}

export function PatternSelection({
  clientId,
  attributes,
  showTitlesAsTooltip = false,
  showSearch = true,
}: PatternSelectionProps) {
  const [searchValue, setSearchValue] = useState('');
  const { replaceBlock, selectBlock } = useDispatch(blockEditorStore);
  const blockPatterns = useBlockPatterns(clientId, attributes);
  /*
   * When we preview Query Loop blocks we should prefer the current
   * block's postType, which is passed through block context.
   */
  const blockPreviewContext = useMemo(
    () => ({
      previewPostType: attributes.query.postType,
    }),
    [attributes.query.postType],
  );
  const filteredBlockPatterns = useMemo(
    () => searchPatterns(blockPatterns, searchValue),
    [blockPatterns, searchValue],
  );

  const onBlockPatternSelect = (pattern: BlockPattern, blocks: BlockInstance[]) => {
    const { newBlocks, queryClientIds } = getTransformedBlocksFromPattern(
      blocks,
      attributes,
    );
    replaceBlock(clientId, newBlocks);
    if (queryClientIds[0]) {
      selectBlock(queryClientIds[0]);
    }
  };
  return (
    <div className="block-library-query-pattern__selection-content">
      { showSearch ? (
        <div className="block-library-query-pattern__selection-search">
          <SearchControl
            __nextHasNoMarginBottom
            onChange={setSearchValue}
            value={searchValue}
            label={__('Search')}
            placeholder={__('Search')}
          />
        </div>
      ) : null }
      <BlockContextProvider value={blockPreviewContext}>
        <BlockPatternsList
          blockPatterns={filteredBlockPatterns}
          onClickPattern={onBlockPatternSelect}
          showTitlesAsTooltip={showTitlesAsTooltip}
        />
      </BlockContextProvider>
    </div>
  );
}

interface PatternSelectionModalProps {
  clientId: string;
  attributes: Record<string, any>;
  setIsPatternSelectionModalOpen: (isOpen: boolean) => void;
}

export default function PatternSelectionModal({
  clientId,
  attributes,
  setIsPatternSelectionModalOpen,
}: PatternSelectionModalProps) {
  return (
    <Modal
      overlayClassName="block-library-query-pattern__selection-modal"
      title={__('Choose a pattern')}
      onRequestClose={() => setIsPatternSelectionModalOpen(false)}
      isFullScreen
    >
      <PatternSelection clientId={clientId} attributes={attributes} />
    </Modal>
  );
}
