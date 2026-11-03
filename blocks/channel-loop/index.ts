// WordPress dependencies.
import { registerBlockType } from '@wordpress/blocks';
import { postList as icon } from '@wordpress/icons';

// Internal dependencies.
import metadata from './block.json';
import deprecated from './deprecated';
import edit from './edit';
import save from './save';

registerBlockType(
  /* @ts-expect-error Provided types are inaccurate to the actual plugin API. */
  metadata,
  {
    deprecated,
    edit,
    icon,
    save,
    variations: [
      /*
       * The template for a block from the inserter. The `template` attribute defaults to no
       * blocks, so that a parsed block, which has no `template` in its comment delimiter, is
       * valid. `deprecated` then moves the template from its inner blocks.
       */
      {
        attributes: {
          template: [
            ['core/post-title', { isLink: true }],
          ],
        },
        isDefault: true,
        name: 'post-title',
        scope: ['inserter'],
        title: metadata.title,
      },
    ],
  },
);
