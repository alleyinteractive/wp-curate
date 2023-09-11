import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

import edit from './edit';
import metadata from './block.json';

import './style.scss';

registerBlockType(
  /* @ts-expect-error Provided types are inaccurate to the actual plugin API. */
  metadata,
  {
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
  },
);
