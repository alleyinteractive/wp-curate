// Global dependencies.
import React from 'react';

// WordPress dependencies.
import {
  useBlockProps,
  useInnerBlocksProps,
} from '@wordpress/block-editor';
import { InnerBlockTemplate } from '@wordpress/blocks';

const ALLOWED_BLOCKS = ['wp-curate/single-post'];

const DEFAULT_BLOCK = {
  name: 'wp-curate/single-post',
};

const TEMPLATE: InnerBlockTemplate[] = [
  ['wp-curate/single-post'],
  ['wp-curate/single-post'],
  ['wp-curate/single-post'],
];

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
  const combinedBlockProps = useInnerBlocksProps(blockProps, {
    allowedBlocks: ALLOWED_BLOCKS,
    // The appender adds another post.
    // @ts-expect-error defaultBlock and directInsert not available in types yet.
    defaultBlock: DEFAULT_BLOCK,
    directInsert: true,
    template: TEMPLATE,
  });

  return <div {...combinedBlockProps} />;
}
