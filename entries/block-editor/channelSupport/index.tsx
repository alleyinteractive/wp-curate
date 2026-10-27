// Global dependencies.
import React from 'react';

// WordPress dependencies.
import {
  // @ts-expect-error BlockContextProvider not available in types yet.
  BlockContextProvider,
  InspectorControls,
} from '@wordpress/block-editor';
import { getBlockType } from '@wordpress/blocks';
import {
  __experimentalToolsPanel as ToolsPanel,
  __experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useSelect } from '@wordpress/data';
import { useCallback, useEffect, useMemo } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

// Plugin dependencies.
import { ChannelPanelSlot } from '../../../components/ChannelPanelSlotFill';
import type { ChannelPanelFillProps } from '../../../components/ChannelPanelSlotFill';
import ChannelSelectControl from '../../../components/ChannelSelectControl';
import useBlockChannel, {
  CHANNEL_CONTEXT,
  channelArgFields,
  hasChannelSupport,
  isChannelProvider,
  toChannelArgs,
  toChannelName,
} from '../../../hooks/useBlockChannel';
import useChannelQueue from '../../../hooks/useChannelQueue';

/*
 * Blocks with the `wp-curate/channel` block support get a Channel panel. A block that provides the
 * channel context, like Channel Loop, gives the channel to the blocks inside it. Any other block
 * takes a post from its channel's queue, which it gets as the `postId` and `postType` context. It
 * can pin a post with an integer `ref` attribute, and a `postType` attribute with the pinned post's
 * type. Like a block binding, the `channel` attribute is an object with the channel `name` and
 * the `args` that the block gives the channel, such as a term. Other scripts add the controls of
 * the arguments through the Channel panel's slot, in `components/ChannelPanelSlotFill`. The
 * `Channel_Block_Support` feature in PHP adds the `channel` attribute and the context that the
 * block uses, and gives the block the same post on the front end.
 */

interface ChannelControlsProps {
  blockName: string;
  channel: string;
  channelArgs: Record<string, unknown>;
  clientId: string;
  context: Record<string, unknown>;
  contextChannel: unknown;
  isProvider: boolean;
  setAttributes: (attributes: Record<string, unknown>) => void;
}

/**
 * The Channel panel of a block with the support, which also sets the channel of a new block.
 *
 * A block that takes a post inside a block that provides a channel, like a Single Post in a Many
 * Posts block, always uses that channel, so it has no panel. A block moved in keeps its own channel
 * attribute, which has no effect there. The editor does not clear it, because a change made in
 * response to a move would be a separate undo step, and undoing it would move the block in again.
 * The block uses its own channel again if it moves back out.
 */
function ChannelControls({
  blockName,
  channel,
  channelArgs,
  clientId,
  context,
  contextChannel,
  isProvider,
  setAttributes,
}: ChannelControlsProps) {
  // The channel that the block would use without its own: a Channel Loop block's, or the post's.
  const inheritedChannel = useBlockChannel('', contextChannel);

  const argFields = useSelect(
    (select) => channelArgFields(select, channel),
    [channel],
  );

  // Only a block that provides the channel context, like Channel Loop, gives the editor a channel.
  const isInProvider = toChannelName(contextChannel) !== null;

  const inherits = !isProvider && isInProvider;

  useEffect(() => {
    /*
     * Any other new block gets the channel that it would inherit, so that it keeps that channel if
     * the channel above it changes later.
     */
    if (!inherits && channel === '' && inheritedChannel !== null && inheritedChannel !== '') {
      setAttributes({ channel: { name: inheritedChannel } });
    }
  }, [channel, inheritedChannel, inherits, setAttributes]);

  const setArgs = useCallback((args: Record<string, unknown>) => {
    setAttributes({ channel: { args, name: channel } });
  }, [channel, setAttributes]);

  const fillProps: ChannelPanelFillProps = useMemo(() => ({
    argFields,
    args: channelArgs,
    blockName,
    channel,
    clientId,
    setArgs,
  }), [argFields, blockName, channel, channelArgs, clientId, setArgs]);

  if (inherits) {
    return null;
  }

  let help: string = __('The block shows a post from this channel.', 'wp-curate');

  if (isProvider) {
    help = __('The blocks inside this block show posts from this channel.', 'wp-curate');
  }

  return (
    <InspectorControls>
      <ToolsPanel
        label={__('WP Curate: Channel', 'wp-curate')}
        panelId={clientId}
        resetAll={(filters = []) => {
          let next = channelArgs;

          // Each fill's filter returns the arguments without its own value.
          filters.forEach((filter) => {
            const out = filter(next);

            if (typeof out === 'object' && out !== null) {
              next = out;
            }
          });

          setArgs(next);
        }}
      >
        {/* A block always has a channel, so the item has no value to reset. */}
        <ToolsPanelItem
          hasValue={() => false}
          isShownByDefault
          label={__('Channel', 'wp-curate')}
          panelId={clientId}
        >
          <ChannelSelectControl
            // The block's context, from the block around it, tells which channels it can select.
            context={context}
            help={help}
            // The arguments of one channel are not the arguments of another.
            onChange={(next) => setAttributes({ channel: { name: next } })}
            value={channel}
            withBlockChannels
          />
        </ToolsPanelItem>
        <ChannelPanelSlot fillProps={fillProps} />
      </ToolsPanel>
    </InspectorControls>
  );
}

/**
 * The edit component of a block that takes a post from its channel, with that post as context.
 *
 * `postId` is null while the channel loads, and 0 when the channel has no posts left.
 */
function ChannelPostEdit({
  BlockEdit,
  clientId,
  context: blockContext,
  pinnedPostType,
  props,
}: {
  BlockEdit: React.ComponentType<any>;
  clientId: string;
  context: Record<string, unknown>;
  pinnedPostType: string;
  props: Record<string, unknown>;
}) {
  const queuedIds = useChannelQueue(clientId);

  let postId: number | null = null;

  if (queuedIds !== null) {
    postId = 0;
  }

  if (queuedIds !== null && queuedIds.length > 0) {
    [postId] = queuedIds;
  }

  const queuedPostType: string = useSelect((select) => {
    const {
      getChannelPostType,
    } = select('wp-curate/channels') as any;

    let out = '';

    if (postId !== null && postId > 0) {
      out = getChannelPostType(postId);
    }

    return out;
  }, [postId]);

  let postType = queuedPostType;

  // A pinned post can be not in the IDs that have loaded, so the block saves its post type.
  if (pinnedPostType !== '') {
    postType = pinnedPostType;
  }

  // The post for the blocks inside this one, the way that `render_block_context` gives it in PHP.
  const innerContext = useMemo(() => ({
    postId,
    postType,
  }), [postId, postType]);

  // The block's own context comes from its props, which the editor has already filtered.
  const context = useMemo(() => ({
    ...blockContext,
    ...innerContext,
  }), [blockContext, innerContext]);

  return (
    <BlockContextProvider value={innerContext}>
      <BlockEdit {...props} context={context} />
    </BlockContextProvider>
  );
}

const withChannelSupport = createHigherOrderComponent(
  (BlockEdit: React.ComponentType<any>) => function ChannelSupportEdit(props: any) {
    const {
      attributes: {
        channel,
        postType,
        ref,
      },
      clientId,
      context,
      context: {
        [CHANNEL_CONTEXT]: contextChannel,
      },
      name,
      setAttributes,
    } = props;

    const blockType = getBlockType(name);

    const ownName = toChannelName(channel);

    if (!hasChannelSupport(blockType) || ownName === null) {
      return <BlockEdit {...props} />;
    }

    const isProvider = isChannelProvider(blockType);

    let pinnedPostType = '';

    if (Number.isInteger(ref) && ref > 0 && typeof postType === 'string') {
      pinnedPostType = postType;
    }

    return (
      <>
        <ChannelControls
          blockName={name}
          channel={ownName}
          channelArgs={toChannelArgs(channel)}
          clientId={clientId}
          context={context}
          contextChannel={contextChannel}
          isProvider={isProvider}
          setAttributes={setAttributes}
        />
        {isProvider ? (
          <BlockEdit {...props} />
        ) : (
          <ChannelPostEdit
            BlockEdit={BlockEdit}
            clientId={clientId}
            context={context}
            pinnedPostType={pinnedPostType}
            props={props}
          />
        )}
      </>
    );
  },
  'withChannelSupport',
);

addFilter('editor.BlockEdit', 'wp-curate/channel-support', withChannelSupport);
