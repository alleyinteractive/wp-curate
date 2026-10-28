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
import { cancelCircleFilled, pencil } from '@wordpress/icons';

// Plugin dependencies.
import useBlockChannel, {
  channelArgFields,
  hasEveryChannelArg,
  pickChannelArgs,
  toBlockChannelArgs,
  toChannelName,
} from '../../hooks/useBlockChannel';

// Internal dependencies.
import PostPicker from './components/post-picker';

/*
 * The inner blocks of a new block outside a Channel Loop block, until a layout modal like the one
 * in Single Term is available.
 */
const BASIC_TEMPLATE: InnerBlockTemplate[] = [
  ['core/post-title', { isLink: true }],
];

/**
 * The editable inner blocks of a block outside a Channel Loop block.
 */
function StandaloneInnerBlocks({ blockProps }: { blockProps: Record<string, unknown> }) {
  const innerBlocksProps = useInnerBlocksProps(blockProps, {
    template: BASIC_TEMPLATE,
  });

  return <div {...innerBlocksProps} />;
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

  /*
   * Give back the blocks that this block sent when the template is the one made from them, so that
   * the editor does not replace the blocks that the user is editing.
   */
  const value = useMemo(() => {
    let blocks: BlockInstance[] = [];

    if (sent.current !== null && sent.current.template === template) {
      ({ blocks } = sent.current);
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

  const innerBlocksProps = useInnerBlocksProps(blockProps, {
    // @ts-expect-error value, onChange, and onInput not available in types yet.
    onChange,
    onInput: onChange,
    value,
  });

  return <div {...innerBlocksProps} />;
}

/**
 * The wp-curate/single-post block edit function.
 *
 * The `wp-curate/channels` block support gives the block its Channel panel, and gives it its post
 * as the `postId` and `postType` context: the pinned post, or else the top of the channel's queue
 * after the blocks before this one. The support also gives that post to the inner blocks.
 *
 * Inside a Channel block, directly or in a Channel Loop, the block uses the Channel block's channel
 * instead of its own. Inside a Channel Loop block, its inner blocks edit that block's template
 * instead of its own. A block moved in from outside keeps its pinned post.
 */
export default function Edit({
  attributes: {
    channel: ownChannel,
    ref,
  },
  clientId,
  context: {
    postId: contextPostId,
    'wp-curate/channel': contextChannel,
    'wp-curate/postTemplate': postTemplate,
  },
  setAttributes,
}: BlockEditProps<{
  channel: { args?: Record<string, unknown>, name: string };
  postType: string;
  ref: number;
}> & {
  clientId: string;
  context: Record<string, unknown>;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const blockProps = useBlockProps();
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

  // The arguments that the queue gives the channel, which the picker gives it too.
  const args = useMemo(
    () => pickChannelArgs(argFields, toBlockChannelArgs(ownChannel, contextChannel)),
    [argFields, contextChannel, ownChannel],
  );

  // The channel has no posts to pick from until the block gives it each argument.
  const hasPosts = channel !== '' && hasEveryChannelArg(argFields, args);

  // The post, null while the channel loads, or 0 when there is no post to show.
  let postId: number | null = null;

  if (typeof contextPostId === 'number') {
    postId = contextPostId;
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
  const isInChannelLoop = Array.isArray(postTemplate) && channelLoopClientId !== '';

  let preview = (
    <StandaloneInnerBlocks blockProps={blockProps} />
  );

  if (isInChannelLoop) {
    preview = (
      <TemplateInnerBlocks
        blockProps={blockProps}
        channelLoopClientId={channelLoopClientId}
        template={postTemplate as InnerBlockTemplate[]}
      />
    );
  }

  // There is always a channel unless none are registered, which will be handled later.
  if (channel === '' && ref === 0 && blockChannel !== null) {
    preview = (
      <div {...blockProps}>
        <Placeholder
          label={__('Single Post', 'wp-curate')}
          instructions={__('No channels are available.', 'wp-curate')}
        />
      </div>
    );
  } else if (!hasEveryChannelArg(argFields, args) && ref === 0) {
    preview = (
      <div {...blockProps}>
        <Placeholder
          label={__('Single Post', 'wp-curate')}
          instructions={__('Complete the channel settings to show its posts.', 'wp-curate')}
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
          label={__('Single Post', 'wp-curate')}
          instructions={__('No posts remaining.', 'wp-curate')}
        />
      </div>
    );
  }

  return (
    <>
      <BlockControls>
        <ToolbarGroup>
          {hasPosts ? (
            <ToolbarButton icon={pencil} onClick={() => setIsPickerOpen(true)}>
              {ref > 0 ? __('Replace post', 'wp-curate') : __('Select post', 'wp-curate')}
            </ToolbarButton>
          ) : null}
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
