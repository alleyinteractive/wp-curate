// Global dependencies.
import classnames from 'classnames';
import React from 'react';

// WordPress dependencies.
import {
  BlockControls,
  store as blockEditorStore,
  useBlockProps,
} from '@wordpress/block-editor';
import { getBlockType, store as blocksStore } from '@wordpress/blocks';
import {
  Placeholder,
  Spinner,
  ToolbarButton,
  ToolbarGroup,
} from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { useMemo, useState } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __, sprintf } from '@wordpress/i18n';
import { closeSmall, pin } from '@wordpress/icons';

// Plugin dependencies.
import useBlockChannel, {
  CHANNEL_CONTEXT,
  channelArgFields,
  channelLabel,
  hasEveryChannelArg,
  hasSinglePostSupport,
  pickChannelArgs,
  toBlockChannelArgs,
  toChannelName,
} from '../../../hooks/useBlockChannel';
import useChannelQueuePost from '../../../hooks/useChannelQueue';

// Internal dependencies.
import PostPicker from './components/post-picker';
import PostToolsDropdown from './components/post-tools-dropdown';

/*
 * The `wp-curate/single-post` block support. A block with this support shows one post from its
 * channel, like the Single Post block. The block also needs the `wp-curate/channels` support, which
 * gives it its channel and its Channel panel.
 *
 * The `Single_Post_Block_Support` feature in PHP gives the block `ref` and `postType` attributes,
 * for a pinned post. Like any block that shows posts from a channel, the block takes its post
 * itself: in `render.php`, it reads its queue from its `wp-curate/queue` context and calls
 * `Queues::take()` with `[ $ref ]`. It must take exactly one post. The support does not change the
 * block's context, so its own `postId` stays the post around it.
 *
 * In the editor, this script does these things:
 *
 * - The queue walk takes one post for the block: its pin, or the top of the queue. A block type can
 *   give its own `channelPostsToTake` callback, but it must take one post, as `render.php` does.
 *   See `hasChannelPostsToTake()`.
 * - Until the block has a post, the support shows a placeholder in place of the edit function:
 *   for no channel, channel settings that are not complete, a channel that loads, and a channel
 *   with no posts remaining.
 * - The block toolbar has "Select post" or "Replace post", "Unpin", and a dropdown to pin, edit, or
 *   view the post.
 * - A block with a pin gets a mark in the canvas. See `PinnedBlockListBlock`.
 *
 * The edit function reads its post with the `getChannelPosts()` selector of the
 * `wp-curate/channels` store. This is the editor version of the take in `render.php`.
 *
 * A block type with variations that have inner blocks, like Single Post, shows its own edit
 * function while it has no inner blocks, so that it can show its variation picker.
 *
 * @example
 * // block.json
 * {
 *   "name": "my-plugin/story-card",
 *   "supports": {
 *     "wp-curate/channels": true,
 *     "wp-curate/single-post": true
 *   },
 *   "render": "file:render.php"
 * }
 *
 * // edit.tsx
 * export default function Edit({ clientId }) {
 *   const posts = useSelect(
 *     (select) => select('wp-curate/channels').getChannelPosts(clientId),
 *     [clientId],
 *   );
 *   // The support shows a placeholder until the block has a post.
 *   const { postId, postType } = posts[0];
 *   const [title] = useEntityProp('postType', postType, 'title', postId);
 *
 *   return <h2 {...useBlockProps()}>{title}</h2>;
 * }
 *
 * // render.php
 * $queue = $block->context['wp-curate/queue'] ?? [];
 * $ref   = $attributes['ref'] ?? 0;
 *
 * if (
 *   empty( $queue['name'] )
 *   || ! ( $block->context['wp-curate/queues'] ?? null )
 *     instanceof \Alley\WP\WP_Curate\Channels\Queues
 * ) {
 *   return;
 * }
 *
 * $post_id = $block->context['wp-curate/queues']->take(
 *   $queue['name'],
 *   [ $ref ],
 *   $queue['args'] ?? [],
 *   $block->context,
 * )[0] ?? null;
 *
 * if ( $post_id ) {
 *   printf(
 *     '<h2 %s>%s</h2>',
 *     get_block_wrapper_attributes(),
 *     esc_html( get_the_title( $post_id ) ),
 *   );
 * }
 */

/**
 * A placeholder in the block wrapper, for a block that does not have a post yet.
 */
function SinglePostPlaceholder({
  instructions,
  name,
}: {
  instructions: string;
  name: string;
}) {
  const blockProps = useBlockProps();

  const blockType = useSelect(
    (select) => (select(blocksStore) as any).getBlockType(name),
    [name],
  );

  let icon = null;

  if (typeof blockType === 'object' && blockType !== null && typeof blockType.icon === 'object') {
    icon = blockType.icon.src;
  }

  return (
    <div {...blockProps}>
      {instructions !== '' ? (
        <Placeholder
          icon={icon}
          instructions={instructions}
          label={blockType.title}
        />
      ) : (
        <Spinner />
      )}
    </div>
  );
}

/**
 * The edit function of a block with the support. See the comment at the top of this file.
 */
function SinglePostSupportEdit({
  BlockEdit,
  ...props
}: {
  BlockEdit: React.ComponentType<any>;
  attributes: { channel?: unknown, ref: number };
  clientId: string;
  context: Record<string, unknown>;
  name: string;
  setAttributes: (next: Record<string, unknown>) => void;
  [key: string]: unknown;
}) {
  const {
    attributes: {
      channel: ownChannel,
      ref,
    },
    clientId,
    context,
    name,
    setAttributes,
  } = props;

  const contextChannel = context[CHANNEL_CONTEXT];

  const [isPickerOpen, setIsPickerOpen] = useState(false);

  /*
   * A block type that fills itself from a variation, like Single Post, shows its own picker of
   * variations while it has no inner blocks.
   */
  const isVariationPickerShown = useSelect((select) => {
    const {
      getBlockCount,
    } = select(blockEditorStore) as any;

    const {
      getBlockVariations,
    } = select(blocksStore) as any;

    const variations = getBlockVariations(name, 'block');

    return getBlockCount(clientId) === 0
      && Array.isArray(variations)
      && variations.some(({ innerBlocks }: { innerBlocks?: unknown }) => (
        Array.isArray(innerBlocks) && innerBlocks.length > 0
      ));
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

  if (isVariationPickerShown) {
    return <BlockEdit {...props} />;
  }

  /*
   * The instructions of the placeholder, an empty string for a spinner while the channel loads, or
   * null when the block has a post.
   */
  let instructions: string | null = null;

  if (channel === '' && blockChannel !== null) {
    // Like on the front end, a block without a channel shows no post, not even its pinned post.
    instructions = __('Select a channel for the block.', 'wp-curate');
  } else if (!hasEveryChannelArg(argFields, args) && ref === 0) {
    instructions = __('Complete the channel settings first.', 'wp-curate');
  } else if (postId === null) {
    instructions = '';
  } else if (postId === 0) {
    instructions = __('No content remaining in this channel.', 'wp-curate');

    // A channel that is not registered has no label.
    if (channelTitle !== '') {
      instructions = sprintf(
        /* translators: %s: Channel label, such as "Free-For-All". */
        __('%s: No content remaining in this channel.', 'wp-curate'),
        channelTitle,
      );
    }
  }

  // Pins the post that the block currently displays.
  let onPinThisPost = null;

  if (ref === 0) {
    onPinThisPost = (pinPostId: number, pinPostType: string) => {
      setAttributes({ postType: pinPostType, ref: pinPostId });
    };
  }

  return (
    <>
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

      {instructions !== null ? (
        <SinglePostPlaceholder instructions={instructions} name={name} />
      ) : (
        <BlockEdit {...props} />
      )}

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

/*
 * The filter runs before the filter of the `wp-curate/channels` support, so that one wraps this
 * one. Thus the Channel panel shows while the block shows a placeholder.
 */
addFilter(
  'editor.BlockEdit',
  'wp-curate/single-post-support',
  createHigherOrderComponent(
    (BlockEdit: React.ComponentType<any>) => function SinglePostSupportBlockEdit(props: any) {
      const {
        name,
      } = props;

      if (!hasSinglePostSupport(getBlockType(name))) {
        return <BlockEdit {...props} />;
      }

      return <SinglePostSupportEdit {...props} BlockEdit={BlockEdit} />;
    },
    'withSinglePostSupport',
  ),
  5,
);

/**
 * The block list item of a block with the support. A block that has pinned a post gets the
 * `is-pinned` class, and a mark with a pin icon in its top right corner. The mark also shows text
 * about the pinned post, such as "Scheduled", from the `data-wp-curate-pin-badge` attribute.
 *
 * A block whose pinned post is not published or scheduled gets the `has-unpublished-pin` class. On
 * the page, it shows the top of its channel's queue, so the mark warns that visitors do not see the
 * pin. A scheduled pin shows when it is published.
 *
 * A filter cannot put an element inside the block's wrapper, so the styles of the Single Post block
 * draw the mark with CSS. The Single Post's editor style loads in every editor where the block is
 * registered.
 */
function PinnedBlockListBlock({
  BlockListBlock,
  ...props
}: {
  BlockListBlock: React.ComponentType<any>;
  attributes: { postType?: unknown, ref: number };
  className?: string;
  wrapperProps?: Record<string, unknown>;
  [key: string]: unknown;
}) {
  const {
    attributes: {
      postType: pinnedPostType,
      ref,
    },
    className,
    wrapperProps,
  } = props;

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

      if (
        typeof statusObject === 'object'
        && statusObject !== null
        && typeof statusObject.name === 'string'
      ) {
        statusLabel = statusObject.name;
      }
    }

    return {
      pinStatus: status,
      pinStatusLabel: statusLabel,
    };
  }, [pinnedPostType, ref]);

  const isPinned = Number.isInteger(ref) && ref > 0;
  const isPinUnpublished = pinStatusLabel !== '' && pinStatus !== 'publish' && pinStatus !== 'future';

  let pinBadgeText = '';

  if (pinStatus === 'future') {
    pinBadgeText = __('Scheduled', 'wp-curate');
  }

  if (isPinUnpublished) {
    pinBadgeText = pinStatusLabel;
  }

  let nextWrapperProps = wrapperProps;

  if (isPinned && pinBadgeText !== '') {
    nextWrapperProps = {
      ...wrapperProps,
      'data-wp-curate-pin-badge': pinBadgeText,
    };
  }

  return (
    <BlockListBlock
      {...props}
      className={classnames(className, {
        'has-unpublished-pin': isPinned && isPinUnpublished,
        'is-pinned': isPinned,
        'wp-curate-has-single-post-support': true,
      })}
      wrapperProps={nextWrapperProps}
    />
  );
}

addFilter(
  'editor.BlockListBlock',
  'wp-curate/single-post-support',
  createHigherOrderComponent(
    (BlockListBlock: React.ComponentType<any>) => function SinglePostBlockListBlock(props: any) {
      const {
        name,
      } = props;

      if (!hasSinglePostSupport(getBlockType(name))) {
        return <BlockListBlock {...props} />;
      }

      return <PinnedBlockListBlock {...props} BlockListBlock={BlockListBlock} />;
    },
    'withSinglePostPin',
  ),
);
