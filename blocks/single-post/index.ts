// WordPress dependencies.
import { registerBlockType } from '@wordpress/blocks';
import { post as icon } from '@wordpress/icons';

// Plugin dependencies.
import { contextForPost } from '../../hooks/useChannelQueue';
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
    /*
     * The `wp-curate/single-post` support takes one post for the block: its pin, or the top of the
     * queue. The inner blocks render only with a post, and get the post as context. Keep matched
     * with `render.php`.
     */
    channelInnerContext: contextForPost,
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
