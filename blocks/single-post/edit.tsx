// Global dependencies.
import classnames from 'classnames';
import React from 'react';

// WordPress dependencies.
import {
  // @ts-expect-error BlockContextProvider not available in types yet.
  BlockContextProvider,
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
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import {
  useMemo,
  useState,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { closeSmall, pin } from '@wordpress/icons';

// Plugin dependencies.
import LayoutVariationPicker from '../../components/LayoutVariationPicker';
import useBlockChannel, {
  channelArgFields,
  channelLabel,
  hasEveryChannelArg,
  pickChannelArgs,
  toBlockChannelArgs,
  toChannelName,
} from '../../hooks/useBlockChannel';
import useChannelQueuePost from '../../hooks/useChannelQueue';

// Internal dependencies.
import PinBadge from './components/pin-badge';
import PostPicker from './components/post-picker';
import PostToolsDropdown from './components/post-tools-dropdown';
import SharedLayoutPanel from './components/shared-layout-panel';
import { useIsLayoutHighlighted } from './layout-highlight';
import './index.scss';

/**
 * The editable inner blocks of the block, which show its post, and the mark of a pinned post after
 * them. The post is in an `article` element, like on the page. The inner blocks get the post as
 * their `postId` and `postType` context, as `Post_Template` gives it in `render.php`. Like on the
 * page, they keep the channel of a Channel Content block around this block, because
 * `BlockContextProvider` merges with the context around it.
 */
function PostInnerBlocks({
  badge,
  blockProps,
  post,
}: {
  badge: React.ReactNode;
  blockProps: Record<string, unknown>;
  post: { postId: number, postType: string };
}) {
  const {
    children,
    ...combinedBlockProps
  } = useInnerBlocksProps(blockProps);

  return (
    <BlockContextProvider value={post}>
      <article {...combinedBlockProps}>
        {children}
        {badge}
      </article>
    </BlockContextProvider>
  );
}

/**
 * The wp-curate/single-post block edit function.
 *
 * The `wp-curate/channels` block support gives the block its Channel panel. The block shows its
 * post: the pinned post, or else the top of the channel's queue after the blocks before this one.
 * It gives that post to its inner blocks as context. Its own `postId` and `postType` context stays
 * the post around it, as on the page.
 *
 * A block without inner blocks shows a picker of layouts. Single Posts with the same `layoutGroup`
 * attribute share a layout: the editor keeps their inner blocks the same, at any place in the
 * post. See `entries/block-editor/sharedLayouts`. The "Single Post Layout" panel in the Styles tab
 * shows the layouts in the post and the variations, and changes the group of the block.
 */
export default function Edit({
  attributes: {
    channel: ownChannel,
    postType: pinnedPostType,
    ref,
  },
  clientId,
  context: {
    'wp-curate/channel': contextChannel,
  },
  name,
  setAttributes,
}: BlockEditProps<{
  channel: { args?: Record<string, unknown>, name: string };
  layoutGroup: string;
  postType: string;
  ref: number;
}> & {
  clientId: string;
  context: Record<string, unknown>;
  name: string;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  /*
   * The status of the pinned post and its label, or empty strings while the post loads. A pinned
   * post that cannot be found, such as a deleted post, has no status.
   */
  const {
    pinStatus,
    pinStatusLabel,
  } = useSelect((select) => {
    const {
      getEntityRecord,
      hasFinishedResolution,
    } = select(coreStore) as any;

    let status = '';
    let statusLabel = '';

    if (ref > 0 && typeof pinnedPostType === 'string' && pinnedPostType !== '') {
      const record = getEntityRecord('postType', pinnedPostType, ref);

      if (typeof record === 'object' && record !== null && typeof record.status === 'string') {
        status = record.status;
        statusLabel = status;
      } else if (hasFinishedResolution('getEntityRecord', ['postType', pinnedPostType, ref])) {
        statusLabel = __('Not found', 'wp-curate');
      }
    }

    // Use the name of the status, such as "Draft", if the user can read it.
    if (status !== '') {
      const statusObject = getEntityRecord('root', 'status', status);

      if (typeof statusObject === 'object' && statusObject !== null && typeof statusObject.name === 'string') {
        statusLabel = statusObject.name;
      }
    }

    return {
      pinStatus: status,
      pinStatusLabel: statusLabel,
    };
  }, [pinnedPostType, ref]);

  /*
   * On the page, a block whose pinned post is not published shows the top of its channel's queue,
   * so the mark warns that visitors do not see the pin. A scheduled pin shows when it is published.
   */
  const isPinUnpublished = pinStatusLabel !== '' && pinStatus !== 'publish' && pinStatus !== 'future';

  let pinBadgeText = '';

  if (pinStatus === 'future') {
    pinBadgeText = __('Scheduled', 'wp-curate');
  }

  if (isPinUnpublished) {
    pinBadgeText = pinStatusLabel;
  }

  const {
    blockType,
    hasInnerBlocks,
    isInSelection,
  } = useSelect((select) => {
    const {
      getBlockCount,
      hasSelectedInnerBlock,
      isBlockSelected,
    } = select(blockEditorStore) as any;

    const {
      getBlockType,
    } = select(blocksStore) as any;

    return {
      // The block type, for the title and icon of the placeholders.
      blockType: getBlockType(name),
      hasInnerBlocks: getBlockCount(clientId) > 0,
      isInSelection: isBlockSelected(clientId) || hasSelectedInnerBlock(clientId, true),
    };
  }, [clientId, name]);

  /*
   * The `has-block-overlay` class stops the inner blocks from taking clicks, like the block
   * overlay that core gives template parts. The style comes from core's block editor content
   * styles, which set `pointer-events: none` on the inner blocks of a block with this class.
   */
  const hasOverlay = hasInnerBlocks && !isInSelection;

  // The user points to the layout of this block in the "Single Post Layout" panel of a block.
  const isLayoutHighlighted = useIsLayoutHighlighted(clientId);

  const blockProps = useBlockProps({
    className: classnames({
      'has-unpublished-pin': isPinUnpublished,
      'has-block-overlay': hasOverlay,
      'is-layout-highlighted': isLayoutHighlighted,
      'is-pinned': ref > 0,
    }),
  });

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

  const channelTitle = useSelect(
    (select) => channelLabel(select, channel),
    [channel],
  );

  // The block's channel arguments, found as the queue finds them, so the picker shows its posts.
  const args = useMemo(
    () => pickChannelArgs(argFields, toBlockChannelArgs(ownChannel, contextChannel)),
    [argFields, contextChannel, ownChannel],
  );

  // The channel has no posts to pick from until the block gives it each argument.
  const hasPosts = channel !== '' && hasEveryChannelArg(argFields, args);

  // The post, null while the channel loads, or a post ID of 0 when there is no post to show.
  const post = useChannelQueuePost(clientId);

  let postId: number | null = null;
  let postType = '';

  if (post !== null) {
    ({
      postId,
      postType,
    } = post);
  }

  let preview = null;

  // Below, the block shows a placeholder in place of its inner blocks until it has a post.
  if (post !== null) {
    preview = (
      <PostInnerBlocks
        badge={ref > 0 ? (
          <PinBadge text={pinBadgeText} />
        ) : null}
        blockProps={blockProps}
        post={post}
      />
    );
  }

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
  } else if (channel === '' && blockChannel !== null) {
    // Like on the front end, a block without a channel shows no post, not even its pinned post.
    preview = (
      <div {...blockProps}>
        <Placeholder
          label={blockType.title}
          icon={blockType.icon.src}
          instructions={__('Select a channel for the block.', 'wp-curate')}
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
    // A channel that is not registered has no label.
    let instructions: string = __('No content remaining in this channel.', 'wp-curate');

    if (channelTitle !== '') {
      instructions = sprintf(
        /* translators: %s: Channel label, such as "Free-For-All". */
        __('%s: No content remaining in this channel.', 'wp-curate'),
        channelTitle,
      );
    }

    preview = (
      <div {...blockProps}>
        <Placeholder
          label={blockType.title}
          icon={blockType.icon.src}
          instructions={instructions}
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

      <SharedLayoutPanel
        clientId={clientId}
        onDetach={() => setAttributes({ layoutGroup: '' })}
        postId={postId}
        postType={postType}
      />

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
