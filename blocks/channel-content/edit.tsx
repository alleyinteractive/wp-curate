// Global dependencies.
import React from 'react';

// WordPress dependencies.
import {
  useBlockProps,
  useInnerBlocksProps,
} from '@wordpress/block-editor';
import { InnerBlockTemplate } from '@wordpress/blocks';

// The inner blocks of a new block: a loop of posts from this block's channel.
const TEMPLATE: InnerBlockTemplate[] = [
  ['wp-curate/channel-loop'],
];

/**
 * The wp-curate/channel-content block edit function.
 *
 * The block gives its channel and its channel arguments to the blocks inside it as block context.
 */
export default function Edit() {
  const blockProps = useBlockProps();
  const innerBlocksProps = useInnerBlocksProps(blockProps, {
    template: TEMPLATE,
  });

  return <div {...innerBlocksProps} />;
}
