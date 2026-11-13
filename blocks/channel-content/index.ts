// WordPress dependencies.
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import { inbox as icon, postList } from '@wordpress/icons';

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
    icon,
    save,
    variations: [
      /*
       * The Single Post Template block can be only inside a Channel Content block, so the
       * inserter offers it as a Channel Content block with an empty Single Post Template block,
       * which shows a picker of layouts.
       */
      {
        description: __('Use a consistent template with a group of Single Post blocks.', 'wp-curate'),
        icon: postList,
        innerBlocks: [
          ['wp-curate/single-post-template'],
        ],
        keywords: [
          __('loop', 'wp-curate'),
          __('posts', 'wp-curate'),
        ],
        name: 'single-post-template',
        scope: ['inserter'],
        title: __('Uniform Single Posts', 'wp-curate'),
      },
    ],
  },
);
