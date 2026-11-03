// Global dependencies.
import React from 'react';

// WordPress dependencies.
import {
  store as blockEditorStore,
  useBlockProps,
  useInnerBlocksProps,
} from '@wordpress/block-editor';
import { store as blocksStore } from '@wordpress/blocks';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

// Plugin dependencies.
import LayoutVariationPicker from '../../components/LayoutVariationPicker';

// Internal dependencies.
import useSharedTemplate from './use-shared-template';

const ALLOWED_BLOCKS = ['wp-curate/single-post'];

const DEFAULT_BLOCK = {
  name: 'wp-curate/single-post',
};

/**
 * The wp-curate/channel-loop block edit function.
 *
 * The inner blocks are Single Post blocks, which each show one post, so the number of them is the
 * number of posts. Each Single Post has its own copy of the template as its inner blocks, and the
 * block keeps the copies the same. Like core's Post Template inside a Query block, the block has
 * no channel of its own: the Single Posts use the channel of the Channel Content block around it.
 *
 * A block without Single Posts shows a picker of layouts. A Single Post moved in from outside
 * keeps its pinned post and gets the loop's template.
 */
export default function Edit({
  clientId,
  name,
}: {
  clientId: string;
  name: string;
}) {
  useSharedTemplate(clientId);

  const blockProps = useBlockProps();
  const combinedBlockProps = useInnerBlocksProps(
    blockProps,
    {
      allowedBlocks: ALLOWED_BLOCKS,
      // The appender adds another post.
      // @ts-expect-error defaultBlock and directInsert not available in types yet.
      defaultBlock: DEFAULT_BLOCK,
      directInsert: true,
    },
  );

  const {
    blockType,
    hasInnerBlocks,
  } = useSelect((select) => {
    const {
      getBlockCount,
    } = select(blockEditorStore) as any;

    const {
      getBlockType,
    } = select(blocksStore) as any;

    return {
      // The block type, for the title and icon of the picker.
      blockType: getBlockType(name),
      hasInnerBlocks: getBlockCount(clientId) > 0,
    };
  }, [clientId, name]);

  let out = (
    <div {...combinedBlockProps} />
  );

  if (!hasInnerBlocks) {
    out = (
      <LayoutVariationPicker
        blockProps={blockProps}
        clientId={clientId}
        icon={blockType.icon.src}
        instructions={__('Choose a layout for each post.', 'wp-curate')}
        label={blockType.title}
        name={name}
      />
    );
  }

  return out;
}
