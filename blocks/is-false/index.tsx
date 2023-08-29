import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';

import edit from './edit';
import metadata from './block.json';

/* @ts-expect-error Provided types are inaccurate to the actual plugin API. */
registerBlockType(metadata, {
  edit,
  save: () => {
    const blockProps = useBlockProps.save();
    return (
      <div {...blockProps}>
        {/* @ts-ignore */}
        <InnerBlocks.Content />
      </div>
    );
  },
});
