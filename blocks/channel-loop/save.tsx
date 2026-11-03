// Global dependencies.
import React from 'react';

// WordPress dependencies.
import {
  InnerBlockTemplate,
  createBlocksFromInnerBlocksTemplate,
  serialize,
} from '@wordpress/blocks';
import { RawHTML } from '@wordpress/element';

/**
 * The wp-curate/channel-loop block save function.
 *
 * The block saves the template of its Single Post blocks, which is in the `template` attribute in
 * the editor, as its inner blocks.
 *
 * @return {WPElement} Element to render.
 */
export default function Save({
  attributes: {
    template,
  },
}: {
  attributes: {
    template: InnerBlockTemplate[];
  };
}) {
  let blocks: ReturnType<typeof createBlocksFromInnerBlocksTemplate> = [];

  if (Array.isArray(template)) {
    blocks = createBlocksFromInnerBlocksTemplate(template);
  }

  // Serialize the blocks as `InnerBlocks.Content` does.
  // @ts-expect-error The options argument not available in types yet.
  const html = serialize(blocks, { isInnerBlocks: true });

  return (
    <RawHTML>{html}</RawHTML>
  );
}
