// WordPress dependencies.
import { registerBlockType } from '@wordpress/blocks';
import { inbox as icon } from '@wordpress/icons';

// Plugin dependencies.
import SINGLE_POST_LAYOUTS from '../../services/singlePostLayouts';

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
    variations: SINGLE_POST_LAYOUTS.map(({
      blocks,
      icon: layoutIcon,
      name,
      title,
    }) => ({
      icon: layoutIcon,
      innerBlocks: [
        [
          'wp-curate/channel-loop',
          { template: blocks },
          [
            ['wp-curate/single-post'],
            ['wp-curate/single-post'],
            ['wp-curate/single-post'],
          ],
        ],
      ],
      name,
      scope: ['block'],
      title,
    })),
  },
);
