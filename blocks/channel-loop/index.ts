// WordPress dependencies.
import { registerBlockType } from '@wordpress/blocks';
import { postList as icon } from '@wordpress/icons';

// Plugin dependencies.
import { MAX_CHANNEL_POSTS } from '../../hooks/useBlockChannel';
import { firstPostContext } from '../../hooks/useChannelQueue';
import SINGLE_POST_LAYOUTS from '../../services/singlePostLayouts';

// Internal dependencies.
import metadata from './block.json';
import edit from './edit';
import save from './save';

/*
 * Each post that remains in the queue, up to the limit. On the page, `render.php` renders a Single
 * Post for each of them.
 */
const POSTS_TO_TAKE = Array.from({ length: MAX_CHANNEL_POSTS }, () => ({ ref: 0 }));

registerBlockType(
  /* @ts-expect-error Provided types are inaccurate to the actual plugin API. */
  metadata,
  {
    channelPostsToTake: () => POSTS_TO_TAKE,
    // The template gets the first post. See `firstPostContext()`.
    channelInnerContext: firstPostContext,
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
