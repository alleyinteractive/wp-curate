// Global dependencies.
import React from 'react';

// WordPress dependencies.
import {
  store as blockEditorStore,
  useBlockProps,
  useInnerBlocksProps,
} from '@wordpress/block-editor';
import { BlockEditProps, store as blocksStore } from '@wordpress/blocks';
import { useSelect } from '@wordpress/data';

// Internal dependencies.
import ChannelContentPlaceholder from './components/channel-content-placeholder';

/**
 * The wp-curate/channel-content block edit function.
 *
 * The block gives its channel and its channel arguments to the blocks inside it as block context.
 * A block without inner blocks offers patterns and layouts for the posts.
 */
export default function Edit({
  attributes: {
    channel,
  },
  clientId,
  name,
}: BlockEditProps<{
  channel: unknown;
}> & {
  clientId: string;
  name: string;
}) {
  const blockProps = useBlockProps();
  const combinedBlockProps = useInnerBlocksProps(blockProps);

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
      blockType: getBlockType(name),
      hasInnerBlocks: getBlockCount(clientId) > 0,
    };
  }, [clientId, name]);

  let out = (
    <div {...combinedBlockProps} />
  );

  if (!hasInnerBlocks) {
    out = (
      <ChannelContentPlaceholder
        blockProps={blockProps}
        channel={channel}
        clientId={clientId}
        icon={blockType.icon.src}
        label={blockType.title}
        name={name}
      />
    );
  }

  return out;
}
