// WordPress dependencies.
import { registerBlockType } from '@wordpress/blocks';
import { post as icon } from '@wordpress/icons';

// Plugin dependencies.
import { firstPostContext } from '../../hooks/useChannelQueue';
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
    // The name in List View shows the type of the post that the block shows.
    __experimentalLabel: label,
    // One slot: the pin, or the top of the queue. Keep matched with `Channel_Block_Support`.
    channelSlots: ({ postType, ref }: Record<string, unknown>) => [{ postType, ref }],
    // The inner blocks get the post. Keep matched with the context filter in `render.php`.
    channelInnerContext: firstPostContext,
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
      innerBlocks: blocks,
      name,
      scope: ['block'],
      title,
    })),
  },
);
