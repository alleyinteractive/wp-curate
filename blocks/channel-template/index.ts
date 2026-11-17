// WordPress dependencies.
import { registerBlockType } from '@wordpress/blocks';
import { postList as icon } from '@wordpress/icons';

// Plugin dependencies.
import SINGLE_POST_LAYOUTS from '../../services/singlePostLayouts';

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
    // The layouts that a block without a template offers, the same as a Single Post's.
    variations: SINGLE_POST_LAYOUTS.map(({
      blocks,
      icon: layoutIcon,
      name,
      title,
    }) => ({
      icon: layoutIcon,
      innerBlocks: blocks,
      name,
      scope: ['block'],
      title,
    })),
  },
);
