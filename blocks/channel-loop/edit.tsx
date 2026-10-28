// Global dependencies.
import React from 'react';

// WordPress dependencies.
import {
  useBlockProps,
  useInnerBlocksProps,
} from '@wordpress/block-editor';
import { InnerBlockTemplate } from '@wordpress/blocks';

// The block that shows one post, which uses the channel of the Channel Content block around this
// one.
const SINGLE_POST = {
  name: 'wp-curate/single-post',
};

// The inner blocks of a new block.
const NEW_BLOCK_TEMPLATE: InnerBlockTemplate[] = [
  [SINGLE_POST.name],
  [SINGLE_POST.name],
  [SINGLE_POST.name],
];

// The blocks allowed inside: only posts.
const ALLOWED_BLOCKS = [SINGLE_POST.name];

/**
 * The wp-curate/channel-loop block edit function.
 *
 * The inner blocks are Single Post blocks, which each show one post, so the number of them is the
 * number of posts. The block gives its `template` attribute to them as block context. Like core's
 * Post Template inside a Query block, it has no channel of its own: the Single Posts use the
 * channel of the Channel Content block around it.
 *
 * A Single Post moved in from outside uses this block's template instead of its own inner blocks,
 * and keeps its pinned post.
 */
export default function Edit() {
  const blockProps = useBlockProps();
  const innerBlocksProps = useInnerBlocksProps(blockProps, {
    allowedBlocks: ALLOWED_BLOCKS,
    // The appender adds another post.
    // @ts-expect-error defaultBlock and directInsert not available in types yet.
    defaultBlock: SINGLE_POST,
    directInsert: true,
    template: NEW_BLOCK_TEMPLATE,
  });

  return <div {...innerBlocksProps} />;
}
