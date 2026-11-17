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
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// Plugin dependencies.
import LayoutVariationPicker from '../../components/LayoutVariationPicker';
import {
  CHANNEL_CONTEXT,
  defaultChannel,
  toChannelName,
} from '../../hooks/useBlockChannel';

// Internal dependencies.
import useSharedTemplate from './use-shared-template';

const ALLOWED_BLOCKS = ['wp-curate/single-post'];

const DEFAULT_BLOCK = {
  name: 'wp-curate/single-post',
};

/**
 * The wp-curate/single-post-template block edit function.
 *
 * The inner blocks are Single Post blocks, which each show one post, so the number of them is the
 * number of posts. Each Single Post has its own copy of the template as its inner blocks, and the
 * block keeps the copies the same. The block has no channel of its own. Inside a Channel Content
 * block, the Single Posts use the channel of that block. Outside one, each Single Post uses its
 * own channel, as a Single Post at the top level does.
 *
 * A block without Single Posts shows a picker of layouts. A Single Post moved in from outside
 * keeps its channel and its pinned post, and gets the block's template.
 */
export default function Edit({
  clientId,
  context,
  name,
}: {
  clientId: string;
  context: Record<string, unknown>;
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

  // The channel context has a value only inside a block that provides it, like Channel Content.
  const isInProvider = toChannelName(context[CHANNEL_CONTEXT]) !== null;

  const {
    blockType,
    globalChannel,
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
      // The channel for a new Single Post, or null while the list of channels loads.
      globalChannel: defaultChannel(select),
      hasInnerBlocks: getBlockCount(clientId) > 0,
    };
  }, [clientId, name]);

  /*
   * Outside a Channel Content block, give each new Single Post the default channel. The channel
   * support gives it to a new block only if the block, or a block around it, is the last block
   * inserted. The Single Posts of a layout are not inserted but replace the inner blocks, and the
   * user can choose a layout after they insert other blocks.
   */
  const innerBlockAttributes = useMemo(() => {
    let out: Record<string, unknown> = {};

    if (!isInProvider && globalChannel !== null && globalChannel !== '') {
      out = { channel: { name: globalChannel } };
    }

    return out;
  }, [globalChannel, isInProvider]);

  let out = (
    <div {...combinedBlockProps} />
  );

  if (!hasInnerBlocks) {
    out = (
      <LayoutVariationPicker
        blockProps={blockProps}
        clientId={clientId}
        icon={blockType.icon.src}
        innerBlockAttributes={innerBlockAttributes}
        instructions={__('Choose a layout for each post.', 'wp-curate')}
        label={blockType.title}
        name={name}
      />
    );
  }

  return out;
}
