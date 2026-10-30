// Global dependencies.
import React from 'react';

// WordPress dependencies.
import {
  // @ts-expect-error BlockContextProvider not available in types yet.
  BlockContextProvider,
  InspectorControls,
  store as blockEditorStore,
} from '@wordpress/block-editor';
import { getBlockType } from '@wordpress/blocks';
import {
  __experimentalToolsPanel as ToolsPanel,
  __experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useDispatch, useSelect } from '@wordpress/data';
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
import useChannelQueuePost from '../../../hooks/useChannelQueue';

// The post context while the channel loads.
const LOADING_POST = {
  postId: null,
  postType: '',
};

/*
 * Blocks with the `wp-curate/channels` block support get a Channel panel. A block that provides the
 * channel context, like Channel Content, gives the channel to the blocks inside it. Any other block
 * takes a post from its channel's queue, which it gets as the `postId` and `postType` context. It
 * can pin a post with an integer `ref` attribute, and a `postType` attribute with the pinned post's
 * type. Like a block binding, the `channel` attribute is an object with the channel `name` and
 * the `args` that the block gives the channel, such as a term. Other scripts add the controls of
 * the arguments through the Channel panel's slot, in `components/ChannelPanelSlotFill`. The
 * `Channel_Block_Support` feature in PHP adds the `channel` attribute and the context that the
 * block uses, and gives the block the same post on the front end.
 */

/**
 * The Channel panel of a block with channel support.
 *
 * A block that takes a post inside a block that provides a channel, like a Single Post in a
 * Channel Content block, always uses that channel, so it has no panel. A Channel Content block
 * inside another one provides its own channel, so it has a panel. A block moved in keeps its own
 * channel attribute, which has no effect there. The editor does not clear it, because a change
 * made in response to a move would be a separate undo step, and undoing it would move the block
 * in again. The block uses its own channel again if it moves back out.
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
}: {
  blockName: string;
  channel: string;
  channelArgs: Record<string, unknown>;
  clientId: string;
  context: Record<string, unknown>;
  contextChannel: unknown;
  isProvider: boolean;
  setAttributes: (attributes: Record<string, unknown>) => void;
}) {
  // The channel the block would use if it didn't have one: inherited from context or the default.
  const inheritedChannel = useBlockChannel('', contextChannel);

  const argFields = useSelect(
    (select) => channelArgFields(select, channel),
    [channel],
  );

  // The channel context has a value only inside a block that provides it, like Channel Content.
  const isInProvider = toChannelName(contextChannel) !== null;

  const inheritsChannel = isInProvider && !isProvider;

  const {
    __unstableMarkNextChangeAsNotPersistent: markNextChangeAsNotPersistent,
  } = useDispatch(blockEditorStore) as any;

  useEffect(() => {
    // Ensure that new blocks get a channel attribute if they're not inheriting one.
    if (!inheritsChannel && channel === '' && inheritedChannel !== null && inheritedChannel !== '') {
      /*
       * Add the channel to the undo step of the insert or move that caused it. As its own step,
       * undoing it would clear the channel, and this effect would set it again.
       */
      markNextChangeAsNotPersistent();
      setAttributes({ channel: { name: inheritedChannel } });
    }
  }, [channel, inheritedChannel, inheritsChannel, markNextChangeAsNotPersistent, setAttributes]);

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

  if (inheritsChannel) {
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
            // The block's context, from the ancestor block, tells which channels it can select.
            context={context}
            help={help}
            // Reset args when the channel changes.
            onChange={(next) => setAttributes({ channel: { name: next } })}
            value={channel}
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
function BlockEditWithPostFromChannel({
  BlockEdit,
  clientId,
  context: blockContext,
  props,
}: {
  BlockEdit: React.ComponentType<any>;
  clientId: string;
  context: Record<string, unknown>;
  props: Record<string, unknown>;
}) {
  const post = useChannelQueuePost(clientId);

  // The post context for the inner blocks. Both values keep their identity between renders.
  let innerContext: { postId: number | null, postType: string } = LOADING_POST;

  if (post !== null) {
    innerContext = post;
  }

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
      },
      clientId,
      context,
      name,
      setAttributes,
    } = props;

    const contextChannel = context[CHANNEL_CONTEXT];

    const blockType = getBlockType(name);

    const ownName = toChannelName(channel);

    if (!hasChannelSupport(blockType) || ownName === null) {
      return <BlockEdit {...props} />;
    }

    const isProvider = isChannelProvider(blockType);

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
          <BlockEditWithPostFromChannel
            BlockEdit={BlockEdit}
            clientId={clientId}
            context={context}
            props={props}
          />
        )}
      </>
    );
  },
  'withChannelSupport',
);

addFilter('editor.BlockEdit', 'wp-curate/channel-support', withChannelSupport);
