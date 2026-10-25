// Global dependencies.
import React from 'react';

// WordPress dependencies.
import {
  // @ts-expect-error BlockContextProvider not available in types yet.
  BlockContextProvider,
  useBlockProps,
  useInnerBlocksProps,
} from '@wordpress/block-editor';
import { BlockEditProps, InnerBlockTemplate } from '@wordpress/blocks';
import { Placeholder, Spinner } from '@wordpress/components';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// Plugin dependencies.
import useChannelQueue from '../../hooks/useChannelQueue';
import useChannelRecord from '../../hooks/useChannelRecord';

// The inner blocks of a new block, until a layout modal like the one in Single Term is available.
const BASIC_TEMPLATE: InnerBlockTemplate[] = [
  ['core/post-title', { isLink: true }],
];

/**
 * The wp-curate/single-post block edit function.
 */
export default function Edit({
  attributes: {
    channel,
  },
  clientId,
}: BlockEditProps<{ channel: string, ref: number }> & { clientId: string }) {
  const blockProps = useBlockProps();
  const innerBlocksProps = useInnerBlocksProps(blockProps, {
    template: BASIC_TEMPLATE,
  });
  const queuedIds = useChannelQueue(clientId);
  const record = useChannelRecord(channel);

  // The selected post, or else the top of the channel's queue after the blocks before this one.
  let postId: number | null = null;

  if (queuedIds !== null) {
    postId = 0;
  }

  if (queuedIds !== null && queuedIds.length > 0) {
    [postId] = queuedIds;
  }

  let postType = '';

  if (record !== null && postId !== null && postId in record.post_types) {
    postType = record.post_types[postId];
  }

  // The same context that `render.php` gives the inner blocks.
  const context = useMemo(() => ({
    postId,
    postType,
  }), [postId, postType]);

  let preview = (
    <BlockContextProvider value={context}>
      <div {...innerBlocksProps} />
    </BlockContextProvider>
  );

  if (postId === null) {
    preview = (
      <div {...blockProps}>
        <Spinner />
      </div>
    );
  } else if (postId === 0) {
    preview = (
      <div {...blockProps}>
        <Placeholder
          label={__('Single Post', 'wp-curate')}
          instructions={__('No posts remaining.', 'wp-curate')}
        />
      </div>
    );
  }

  return preview;
}
