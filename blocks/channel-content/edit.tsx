// Global dependencies.
import React from 'react';

// WordPress dependencies.
import {
  useBlockProps,
  useInnerBlocksProps,
} from '@wordpress/block-editor';
import { InnerBlockTemplate } from '@wordpress/blocks';

// The inner blocks of a new block: a loop of posts from this block's channel.
const NEW_BLOCK_TEMPLATE: InnerBlockTemplate[] = [
  ['wp-curate/channel-loop'],
];

/**
 * The wp-curate/channel-content block edit function.
 *
 * The block gives its channel and its channel arguments to the blocks inside it as block context.
 * Each Single Post block inside, directly or in a Channel Loop block, shows a post from that
 * channel, so the inner blocks can lay out a section such as a featured post and a list of more.
 * A Channel Content block inside this one gives its own channel to the blocks inside it.
 *
 * The `wp-curate/channels` block support gives the block its Channel panel, and gives a new block
 * the channel that it would inherit.
 */
export default function Edit() {
  const blockProps = useBlockProps();
  const innerBlocksProps = useInnerBlocksProps(blockProps, {
    template: NEW_BLOCK_TEMPLATE,
  });

  return <div {...innerBlocksProps} />;
}
