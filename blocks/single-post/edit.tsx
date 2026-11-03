// Global dependencies.
import React from 'react';

// WordPress dependencies.
import {
  BlockControls,
  store as blockEditorStore,
  useBlockProps,
  useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
  BlockEditProps,
  store as blocksStore,
} from '@wordpress/blocks';
import {
  Placeholder,
  Spinner,
  ToolbarButton,
  ToolbarGroup,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import {
  useMemo,
  useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { closeSmall, pin } from '@wordpress/icons';

// Plugin dependencies.
import LayoutVariationPicker from '../../components/LayoutVariationPicker';
import useBlockChannel, {
  channelArgFields,
  hasEveryChannelArg,
  pickChannelArgs,
  toBlockChannelArgs,
  toChannelName,
} from '../../hooks/useBlockChannel';

// Internal dependencies.
import PostPicker from './components/post-picker';
import PostToolsDropdown from './components/post-tools-dropdown';
import './index.scss';

/**
 * The editable inner blocks of the block, which show its post.
 */
function PostInnerBlocks({
  blockProps,
}: {
  blockProps: Record<string, unknown>;
}) {
  const combinedBlockProps = useInnerBlocksProps(blockProps);

  return <div {...combinedBlockProps} />;
}

/**
 * The wp-curate/single-post block edit function.
 *
 * The `wp-curate/channels` block support gives the block its Channel panel, and gives it its post
 * as the `postId` and `postType` context: the pinned post, or else the top of the channel's queue
 * after the blocks before this one. The support also gives that post to the inner blocks.
 *
 * A block without inner blocks shows a picker of layouts. Inside a Channel Loop block, the loop
 * keeps the inner blocks of its Single Posts the same.
 */
export default function Edit({
  attributes: {
    channel: ownChannel,
    ref,
  },
  clientId,
  context: {
    postId: contextPostId,
    postType: contextPostType,
    'wp-curate/channel': contextChannel,
  },
  name,
  setAttributes,
}: BlockEditProps<{
  channel: { args?: Record<string, unknown>, name: string };
  postType: string;
  ref: number;
}> & {
  clientId: string;
  context: Record<string, unknown>;
  name: string;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const blockProps = useBlockProps({
    className: ref > 0 ? 'is-pinned' : undefined,
  });

  const {
    blockType,
    hasInnerBlocks,
  } = useSelect((select) => {
    const {
      getBlockCount,
    } = select(blockEditorStore) as any;

    const {
      getBlockType,
    } = select(blocksStore) as any;

    return {
      // The block type, for the title and icon of the placeholders.
      blockType: getBlockType(name),
      hasInnerBlocks: getBlockCount(clientId) > 0,
    };
  }, [clientId, name]);

  let ownName = toChannelName(ownChannel);

  if (ownName === null) {
    ownName = '';
  }

  const blockChannel = useBlockChannel(ownName, contextChannel);

  let channel = '';

  if (blockChannel !== null) {
    channel = blockChannel;
  }

  const argFields = useSelect(
    (select) => channelArgFields(select, channel),
    [channel],
  );

  // The block's channel arguments, found as the queue finds them, so the picker shows its posts.
  const args = useMemo(
    () => pickChannelArgs(argFields, toBlockChannelArgs(ownChannel, contextChannel)),
    [argFields, contextChannel, ownChannel],
  );

  // The channel has no posts to pick from until the block gives it each argument.
  const hasPosts = channel !== '' && hasEveryChannelArg(argFields, args);

  // The post, null while the channel loads, or 0 when there is no post to show.
  let postId: number | null = null;
  let postType = '';

  if (typeof contextPostId === 'number') {
    postId = contextPostId;
  }

  if (typeof contextPostType === 'string') {
    postType = contextPostType;
  }

  let preview = (
    <PostInnerBlocks blockProps={blockProps} />
  );

  const isLayoutPickerShown = !hasInnerBlocks;

  // Pins the post that the block currently displays.
  let onPinThisPost = null;

  if (ref === 0) {
    onPinThisPost = (pinPostId: number, pinPostType: string) => {
      setAttributes({ postType: pinPostType, ref: pinPostId });
    };
  }

  if (isLayoutPickerShown) {
    preview = (
      <LayoutVariationPicker
        blockProps={blockProps}
        clientId={clientId}
        icon={blockType.icon.src}
        instructions={__('Choose a layout for the post.', 'wp-curate')}
        label={blockType.title}
        name={name}
      />
    );
  } else if (channel === '' && ref === 0 && blockChannel !== null) {
    // There is always a channel unless none is registered, which will be handled later.
    preview = (
      <div {...blockProps}>
        <Placeholder
          label={blockType.title}
          icon={blockType.icon.src}
          instructions={__('No channels are available.', 'wp-curate')}
        />
      </div>
    );
  } else if (!hasEveryChannelArg(argFields, args) && ref === 0) {
    preview = (
      <div {...blockProps}>
        <Placeholder
          label={blockType.title}
          icon={blockType.icon.src}
          instructions={__('Complete the channel settings first.', 'wp-curate')}
        />
      </div>
    );
  } else if (postId === null) {
    preview = (
      <div {...blockProps}>
        <Spinner />
      </div>
    );
  } else if (postId === 0) {
    preview = (
      <div {...blockProps}>
        <Placeholder
          label={blockType.title}
          icon={blockType.icon.src}
          instructions={__('No posts remaining in the channel.', 'wp-curate')}
        />
      </div>
    );
  }

  return (
    <>
      {!isLayoutPickerShown ? (
        <BlockControls>
          <ToolbarGroup>
            {hasPosts ? (
              <ToolbarButton icon={pin} onClick={() => setIsPickerOpen(true)}>
                {ref > 0 ? __('Replace post', 'wp-curate') : __('Select post', 'wp-curate')}
              </ToolbarButton>
            ) : null}
            {ref > 0 ? (
              <ToolbarButton
                icon={closeSmall}
                onClick={() => setAttributes({ postType: '', ref: 0 })}
              >
                {__('Unpin', 'wp-curate')}
              </ToolbarButton>
            ) : null}
            <PostToolsDropdown
              onPin={onPinThisPost}
              postId={postId}
              postType={postType}
            />
          </ToolbarGroup>
        </BlockControls>
      ) : null}

      {preview}

      {isPickerOpen ? (
        <PostPicker
          args={args}
          channel={channel}
          clientId={clientId}
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
