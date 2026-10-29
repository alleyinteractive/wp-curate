// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { store as blocksStore } from '@wordpress/blocks';
import { useSelect } from '@wordpress/data';
import { registerPlugin } from '@wordpress/plugins';

// Internal dependencies.
import './channelStore';
import './channelSupport';
import Deduplication from './deduplication/deduplication';
import FreeForAllArgs from './freeForAllArgs';
import LatestPostsInTermArgs from './latestPostsInTermArgs';

/**
 * The Deduplication panel, where the Query block is registered.
 *
 * The Query block registers only where `Supported_Post_Types::should_register_block()` allows.
 */
registerPlugin(
  'wp-curate-deduplication',
  {
    // @ts-ignore
    icon: '',
    render: function DeduplicationWhereQueryBlock() {
      const hasQueryBlock: boolean = useSelect((select) => {
        const {
          getBlockType,
        } = select(blocksStore) as any;

        return getBlockType('wp-curate/query') !== undefined;
      }, []);

      return hasQueryBlock ? <Deduplication /> : null;
    },
  },
);

/**
 * The controls for the bundled channels' arguments.
 */
registerPlugin(
  'wp-curate-channels',
  {
    // @ts-ignore
    icon: '',
    render: function ChannelArgs() {
      return (
        <>
          <FreeForAllArgs />
          <LatestPostsInTermArgs />
        </>
      );
    },
  },
);
