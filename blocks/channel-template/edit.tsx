// Global dependencies.
import classnames from 'classnames';
import React from 'react';

// WordPress dependencies.
import {
  // @ts-expect-error BlockContextProvider not available in types yet.
  BlockContextProvider,
  // @ts-expect-error __experimentalUseBlockPreview not available in types yet.
  __experimentalUseBlockPreview as useBlockPreview,
  store as blockEditorStore,
  useBlockProps,
  useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
  BlockEditProps,
  BlockInstance,
  store as blocksStore,
} from '@wordpress/blocks';
import { Placeholder, Spinner } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { memo, useMemo, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

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
import { useChannelQueuePosts } from '../../hooks/useChannelQueue';

/**
 * The editable copy of the template, for the active post. The post is in an `article` element,
 * like on the page.
 */
function TemplateInnerBlocks() {
  const innerBlocksProps = useInnerBlocksProps(
    {},
    // The layout of the block applies to the posts, not to the blocks in each post.
    // @ts-expect-error __unstableDisableLayoutClassNames not available in types yet.
    { __unstableDisableLayoutClassNames: true },
  );

  return (
    <article {...innerBlocksProps} />
  );
}

/**
 * A preview of the template for a post that is not active, like the previews of core's Post
 * Template block. Selecting the preview makes its post the active one.
 */
function TemplatePreview({
  blocks,
  isHidden,
  postId,
  setActivePostId,
}: {
  blocks: BlockInstance[];
  isHidden: boolean;
  postId: number;
  setActivePostId: (id: number) => void;
}) {
  const blockPreviewProps = useBlockPreview({
    blocks,
  });

  const onActivate = () => setActivePostId(postId);

  return (
    <article
      {...blockPreviewProps}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onActivate();
        }
      }}
      style={{
        display: isHidden ? 'none' : undefined,
      }}
    />
  );
}

const MemoizedTemplatePreview = memo(TemplatePreview);

/**
 * The wp-curate/channel-template block edit function.
 *
 * The `wp-curate/channels` block support gives the block a channel, like a Single Post, and the
 * block shows each post that remains in the channel's queue after the blocks before it.
 *
 * Like core's Post Template block, the inner blocks are the template of each post.
 * A block without inner blocks shows a picker of layouts.
 */
export default function Edit({
  __unstableLayoutClassNames: layoutClassNames,
  attributes: {
    channel: ownChannel,
  },
  clientId,
  context: {
    'wp-curate/channel': contextChannel,
  },
  name,
}: BlockEditProps<{
  channel: { args?: Record<string, unknown>, name: string };
}> & {
  __unstableLayoutClassNames?: string;
  clientId: string;
  context: Record<string, unknown>;
  name: string;
}) {
  // The post whose template the user edits, or null for the first post.
  const [activePostId, setActivePostId] = useState<number | null>(null);

  const {
    blockType,
    blocks,
    hasInnerBlocks,
  } = useSelect((select) => {
    const {
      getBlockCount,
      getBlocks,
    } = select(blockEditorStore) as any;

    const {
      getBlockType,
    } = select(blocksStore) as any;

    return {
      // The block type, for the title and icon of the placeholders.
      blockType: getBlockType(name),
      // The template, for the previews.
      blocks: getBlocks(clientId),
      hasInnerBlocks: getBlockCount(clientId) > 0,
    };
  }, [clientId, name]);

  const blockProps = useBlockProps({
    // The layout of the block applies to its posts, which are not inner blocks.
    className: classnames(layoutClassNames),
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

  // The block's channel arguments.
  const args = useMemo(
    () => pickChannelArgs(argFields, toBlockChannelArgs(ownChannel, contextChannel)),
    [argFields, contextChannel, ownChannel],
  );

  // The posts, or null while the channel loads.
  const posts = useChannelQueuePosts(clientId);

  let activeId = 0;

  if (posts !== null && posts.length > 0) {
    activeId = posts[0].postId;
  }

  /*
   * A post that the user made active can leave the queue, such as when a block before this one
   * pins it. Then the first post is active.
   */
  if (posts !== null && posts.some(({ postId }) => postId === activePostId)) {
    activeId = activePostId as number;
  }

  let out = (
    <div {...blockProps}>
      <Spinner />
    </div>
  );

  if (!hasInnerBlocks) {
    out = (
      <LayoutVariationPicker
        blockProps={blockProps}
        clientId={clientId}
        icon={blockType.icon.src}
        instructions={__('Choose a layout for each post.', 'wp-curate')}
        label={blockType.title}
        name={name}
      />
    );
  } else if (channel === '' && blockChannel !== null) {
    // Like on the front end, a block without a channel shows no posts.
    out = (
      <div {...blockProps}>
        <Placeholder
          label={blockType.title}
          icon={blockType.icon.src}
          instructions={__('Select a channel for the block.', 'wp-curate')}
        />
      </div>
    );
  } else if (!hasEveryChannelArg(argFields, args)) {
    out = (
      <div {...blockProps}>
        <Placeholder
          label={blockType.title}
          icon={blockType.icon.src}
          instructions={__('Complete the channel settings first.', 'wp-curate')}
        />
      </div>
    );
  } else if (posts !== null && posts.length === 0) {
    // A channel that is not registered has no label.
    let instructions: string = __('No content remaining in this channel.', 'wp-curate');

    if (channelTitle !== '') {
      instructions = sprintf(
        /* translators: %s: Channel label, such as "Free-For-All". */
        __('%s: No content remaining in this channel.', 'wp-curate'),
        channelTitle,
      );
    }

    out = (
      <div {...blockProps}>
        <Placeholder
          label={blockType.title}
          icon={blockType.icon.src}
          instructions={instructions}
        />
      </div>
    );
  } else if (posts !== null) {
    /*
     * Like core's Post Template, each post has a preview, and the preview of the active post is
     * hidden instead of removed, so that it does not render again when its post stops being active.
     */
    out = (
      <div {...blockProps}>
        {/* The hook gives the same post objects until they change, so each context stays. */}
        {posts.map((post) => (
          <BlockContextProvider key={post.postId} value={post}>
            {post.postId === activeId ? (
              <TemplateInnerBlocks />
            ) : null}

            <MemoizedTemplatePreview
              blocks={blocks}
              isHidden={post.postId === activeId}
              postId={post.postId}
              setActivePostId={setActivePostId}
            />
          </BlockContextProvider>
        ))}
      </div>
    );
  }

  return out;
}
