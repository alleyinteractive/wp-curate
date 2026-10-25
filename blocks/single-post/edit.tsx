// Global dependencies.
import React from 'react';

// WordPress dependencies.
import {
  // @ts-expect-error BlockContextProvider not available in types yet.
  BlockContextProvider,
  BlockControls,
  useBlockProps,
  useInnerBlocksProps,
} from '@wordpress/block-editor';
import { BlockEditProps, InnerBlockTemplate } from '@wordpress/blocks';
import {
  Placeholder,
  Spinner,
  ToolbarButton,
  ToolbarGroup,
} from '@wordpress/components';
import { useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { cancelCircleFilled, pencil } from '@wordpress/icons';

// Plugin dependencies.
import useChannelQueue from '../../hooks/useChannelQueue';
import useChannelRecord from '../../hooks/useChannelRecord';

// Internal dependencies.
import PostPicker from './components/post-picker';

// The inner blocks of a new block, until a layout modal like the one in Single Term is available.
const BASIC_TEMPLATE: InnerBlockTemplate[] = [
  ['core/post-title', { isLink: true }],
];

interface SinglePostAttributes {
  channel: string;
  postType: string;
  ref: number;
}

/**
 * The wp-curate/single-post block edit function.
 */
export default function Edit({
  attributes: {
    channel,
    postType: pinnedPostType,
    ref,
  },
  clientId,
  setAttributes,
}: BlockEditProps<SinglePostAttributes> & { clientId: string }) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const blockProps = useBlockProps();
  const innerBlocksProps = useInnerBlocksProps(blockProps, {
    template: BASIC_TEMPLATE,
  });
  const queuedIds = useChannelQueue(clientId);
  const record = useChannelRecord(channel);

  // The pinned post, or else the top of the channel's queue after the blocks before this one.
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

  // A pinned post can be past the IDs that have loaded, so the block saves its post type.
  if (ref > 0 && pinnedPostType !== '') {
    postType = pinnedPostType;
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

  return (
    <>
      {channel !== '' ? (
        <BlockControls>
          <ToolbarGroup>
            <ToolbarButton icon={pencil} onClick={() => setIsPickerOpen(true)}>
              {ref > 0 ? __('Replace post', 'wp-curate') : __('Select post', 'wp-curate')}
            </ToolbarButton>
            {ref > 0 ? (
              <ToolbarButton
                icon={cancelCircleFilled}
                onClick={() => setAttributes({ postType: '', ref: 0 })}
              >
                {__('Clear', 'wp-curate')}
              </ToolbarButton>
            ) : null}
          </ToolbarGroup>
        </BlockControls>
      ) : null}

      {preview}

      {isPickerOpen ? (
        <PostPicker
          channel={channel}
          selectedId={ref}
          onClose={() => setIsPickerOpen(false)}
          onSelect={(id, selectedPostType) => {
            setAttributes({ postType: selectedPostType, ref: id });
            setIsPickerOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
