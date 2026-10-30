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
  BlockInstance,
  InnerBlockTemplate,
  createBlocksFromInnerBlocksTemplate,
  store as blocksStore,
} from '@wordpress/blocks';
import {
  Placeholder,
  Spinner,
  ToolbarButton,
  ToolbarGroup,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import {
  useCallback,
  useMemo,
  useRef,
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
 * The editable inner blocks of a block outside a Channel Loop block.
 */
function StandaloneInnerBlocks({
  blockProps,
}: {
  blockProps: Record<string, unknown>;
}) {
  const combinedBlockProps = useInnerBlocksProps(blockProps);

  return <div {...combinedBlockProps} />;
}

/**
 * Converts blocks to a template in the shape of `InnerBlockTemplate`.
 *
 * @param blocks Blocks.
 */
function toInnerBlockTemplate(blocks: BlockInstance[]): InnerBlockTemplate[] {
  return blocks.map(({
    attributes,
    innerBlocks,
    name,
  }) => [name, attributes, toInnerBlockTemplate(innerBlocks)]);
}

/**
 * The inner blocks of a block inside a Channel Loop block, which edit that block's template.
 *
 * The inner blocks are controlled: they come from the template, and each change goes back to the
 * template. The editor does not save controlled inner blocks with the block itself. Every Single
 * Post block in the Channel Loop block edits the same template.
 */
function TemplateInnerBlocks({
  blockProps,
  channelLoopClientId,
  template,
}: {
  blockProps: Record<string, unknown>;
  channelLoopClientId: string;
  template: InnerBlockTemplate[];
}) {
  const {
    updateBlockAttributes,
  } = useDispatch(blockEditorStore);

  // The last blocks that this block sent to the template, and the template made from them.
  const sent = useRef<{ blocks: BlockInstance[], template: InnerBlockTemplate[] } | null>(null);

  // If this block made the template, reuse its blocks, so that new ones do not replace them.
  const value = useMemo(() => {
    let blocks: BlockInstance[] = [];

    if (sent.current !== null && sent.current.template === template) {
      ({
        blocks,
      } = sent.current);
    } else {
      blocks = createBlocksFromInnerBlocksTemplate(template);
    }

    return blocks;
  }, [template]);

  const onChange = useCallback((blocks: BlockInstance[]) => {
    const next = toInnerBlockTemplate(blocks);

    sent.current = {
      blocks,
      template: next,
    };

    updateBlockAttributes(channelLoopClientId, { template: next });
  }, [channelLoopClientId, updateBlockAttributes]);

  const combinedBlockProps = useInnerBlocksProps(blockProps, {
    // @ts-expect-error value, onChange, and onInput not available in types yet.
    onChange,
    onInput: onChange,
    value,
  });

  return <div {...combinedBlockProps} />;
}

/**
 * The wp-curate/single-post block edit function.
 *
 * The `wp-curate/channels` block support gives the block its Channel panel, and gives it its post
 * as the `postId` and `postType` context: the pinned post, or else the top of the channel's queue
 * after the blocks before this one. The support also gives that post to the inner blocks.
 *
 * Inside a Channel Loop block, the inner blocks edit the loop's template, which every Single Post
 * in the loop shares, instead of their own. Outside one, a block without inner blocks shows a
 * picker of layouts.
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
    'wp-curate/loopTemplate': loopTemplate,
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

  // The nearest Channel Loop block, whose template the block edits, or an empty string.
  const channelLoopClientId: string = useSelect((select) => {
    const {
      getBlockParentsByBlockName,
    } = select(blockEditorStore) as any;

    const [nearest] = getBlockParentsByBlockName(clientId, 'wp-curate/channel-loop', true);

    let out = '';

    if (typeof nearest === 'string') {
      out = nearest;
    }

    return out;
  }, [clientId]);

  // Only a Channel Loop block provides a template.
  const isInChannelLoop = Array.isArray(loopTemplate) && channelLoopClientId !== '';

  let preview = (
    <StandaloneInnerBlocks blockProps={blockProps} />
  );

  if (isInChannelLoop) {
    preview = (
      <TemplateInnerBlocks
        blockProps={blockProps}
        channelLoopClientId={channelLoopClientId}
        template={loopTemplate as InnerBlockTemplate[]}
      />
    );
  }

  const isLayoutPickerShown = !isInChannelLoop && !hasInnerBlocks;

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
