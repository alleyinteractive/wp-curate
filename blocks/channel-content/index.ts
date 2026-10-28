// WordPress dependencies.
import { registerBlockType } from '@wordpress/blocks';

// Internal dependencies.
import metadata from './block.json';
import edit from './edit';
import label from './label';
import save from './save';

registerBlockType(
  /* @ts-expect-error Provided types are inaccurate to the actual plugin API. */
  metadata,
  {
    // The name in List View shows the label of the block's channel.
    __experimentalLabel: label,
    edit,
    save,
  },
);
