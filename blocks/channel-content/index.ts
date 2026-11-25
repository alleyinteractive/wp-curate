// WordPress dependencies.
import { registerBlockType } from '@wordpress/blocks';
import { inbox as icon } from '@wordpress/icons';

// Internal dependencies.
import metadata from './block.json';
import edit from './edit';
import save from './save';

registerBlockType(
  /* @ts-expect-error Provided types are inaccurate to the actual plugin API. */
  metadata,
  {
    edit,
    icon,
    save,
  },
);
