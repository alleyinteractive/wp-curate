// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { InnerBlocks } from '@wordpress/block-editor';
import { BlockInstance } from '@wordpress/blocks';

// Plugin dependencies.
import toInnerBlockTemplate from '../../services/innerBlockTemplate';

// Internal dependencies.
import metadata from './block.json';

/*
 * Not an old version of the block. The block saves its template as its inner blocks, but the
 * editor keeps the template in the `template` attribute so that the inner blocks can be the
 * Single Posts. Each time the editor parses the block, this entry moves the template to the
 * attribute before the block reaches the editor's store, so the move is not a change to the post.
 */
const deprecated = [
  {
    attributes: metadata.attributes,
    supports: metadata.supports,
    // The parsed block is valid, so the editor uses this entry only when it is eligible.
    isEligible: (attributes: unknown, innerBlocks: BlockInstance[]) => innerBlocks.length > 0,
    migrate: (attributes: Record<string, unknown>, innerBlocks: BlockInstance[]) => [
      {
        ...attributes,
        template: toInnerBlockTemplate(innerBlocks),
      },
      // The block makes its Single Post blocks from `posts`.
      [],
    ],
    // The editor checks this against the saved HTML outside the inner blocks, which is empty.
    save: () => <InnerBlocks.Content />,
  },
];

export default deprecated;
