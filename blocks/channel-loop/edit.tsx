// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import { InnerBlockTemplate } from '@wordpress/blocks';

// Internal dependencies.
import useSharedTemplate from './use-shared-template';

const ALLOWED_BLOCKS = ['wp-curate/single-post'];

const DEFAULT_BLOCK = {
  name: 'wp-curate/single-post',
};

const SINGLE_POST: InnerBlockTemplate = [
  'wp-curate/single-post',
  {},
  [
    ['core/post-title', { isLink: true }],
  ],
];

const TEMPLATE: InnerBlockTemplate[] = [
  SINGLE_POST,
  SINGLE_POST,
  SINGLE_POST,
];

/**
 * The wp-curate/channel-loop block edit function.
 *
 * The inner blocks are Single Post blocks, which each show one post, so the number of them is the
 * number of posts. Each Single Post has its own copy of the template as its inner blocks, and the
 * block keeps the copies the same. Like core's Post Template inside a Query block, the block has
 * no channel of its own: the Single Posts use the channel of the Channel Content block around it.
 *
 * A Single Post moved in from outside keeps its pinned post and gets the loop's template.
 */
export default function Edit({
  clientId,
}: {
  clientId: string;
}) {
  useSharedTemplate(clientId);

  const combinedBlockProps = useInnerBlocksProps(
    useBlockProps(),
    {
      allowedBlocks: ALLOWED_BLOCKS,
      // The appender adds another post.
      // @ts-expect-error defaultBlock and directInsert not available in types yet.
      defaultBlock: DEFAULT_BLOCK,
      directInsert: true,
      template: TEMPLATE,
    },
  );

  return <div {...combinedBlockProps} />;
}
