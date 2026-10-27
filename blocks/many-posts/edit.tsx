// Global dependencies.
import React from 'react';

// WordPress dependencies.
import {
  useBlockProps,
  useInnerBlocksProps,
} from '@wordpress/block-editor';
import { InnerBlockTemplate } from '@wordpress/blocks';

// The block that shows one post, which uses this block's channel.
const SINGLE_POST = {
  name: 'wp-curate/single-post',
};

// The inner blocks of a new block.
const NEW_BLOCK_TEMPLATE: InnerBlockTemplate[] = [
  [SINGLE_POST.name],
  [SINGLE_POST.name],
  [SINGLE_POST.name],
];

/**
 * The wp-curate/many-posts block edit function.
 *
 * The inner blocks can be any blocks. Each Single Post block inside shows one post, so the number
 * of Single Post blocks is the number of posts. The block gives its channel and its `template`
 * attribute to them as block context.
 *
 * The `wp-curate/channel` block support gives the block its Channel panel, and gives a new block
 * the channel that it would inherit.
 */
export default function Edit() {
  const blockProps = useBlockProps();
  const innerBlocksProps = useInnerBlocksProps(blockProps, {
    // The appender adds another post.
    // @ts-expect-error defaultBlock and directInsert not available in types yet.
    defaultBlock: SINGLE_POST,
    directInsert: true,
    template: NEW_BLOCK_TEMPLATE,
  });

  return <div {...innerBlocksProps} />;
}
