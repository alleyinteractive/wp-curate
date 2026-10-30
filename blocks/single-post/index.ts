// WordPress dependencies.
import { registerBlockType } from '@wordpress/blocks';
import { post as icon } from '@wordpress/icons';

// Internal dependencies.
import metadata from './block.json';
import edit from './edit';
import label from './label';
import save from './save';

registerBlockType(
  /* @ts-expect-error Provided types are inaccurate to the actual plugin API. */
  metadata,
  {
    // The name in List View shows the type of the post that the block shows.
    __experimentalLabel: label,
    edit,
    icon,
    save,
  },
);
