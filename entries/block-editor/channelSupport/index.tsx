// Global dependencies.
import React from 'react';

// WordPress dependencies.
import {
  // @ts-expect-error BlockContextProvider not available in types yet.
  BlockContextProvider,
  InspectorControls,
  store as blockEditorStore,
} from '@wordpress/block-editor';
import { getBlockType, store as blocksStore } from '@wordpress/blocks';
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
import {
  CHANNEL_CONTEXT,
  channelArgFields,
  channelBlockSupportSettings,
  defaultChannel,
  hasChannelSupport,
  isChannelProvider,
  takesRemainingPosts,
  toBlockChannel,
  toChannelArgs,
  toChannelName,
} from '../../../hooks/useBlockChannel';
import useChannelQueuePost from '../../../hooks/useChannelQueue';

// Namespace for bundled blocks.
const BLOCK_NAMESPACE = 'wp-curate/';

// The post context while the channel loads.
const LOADING_POST = {
  postId: null,
  postType: '',
};

// The context of a block without a channel, which keeps the context it has.
const NO_POST_CONTEXT = {};

/*
 * Blocks with the `wp-curate/channels` block support get a Channel panel. A block that provides the
 * channel context, like Channel Content, gives the channel to the blocks inside it. Any other block
 * takes a post from its channel's queue, which it gets as the `postId` and `postType` context. Like
 * a block binding, the `channel` attribute is an object with the channel `name` and the `args` that
 * the block gives the channel, such as a term. Other scripts add the controls of the arguments
 * through the Channel panel's slot, in `components/ChannelPanelSlotFill`. The blocks that use the
 * same channel, arguments, and context share a queue, so they do not show the same post twice.
 * Blocks in other queues can show the same post. The `Channel_Block_Support` feature in PHP adds
 * the `channel` attribute and the context that the block uses, and gives the block the same post
 * on the front end.
 *
 * The Single Post block can pin a post with an integer `ref` attribute, and a `postType` attribute
 * with the pinned post's type. Only this block type can pin a post, so the plugin gives `ref` no
 * meaning on other block types. See `pinsPost()`.
 *
 * The Channel Template block takes every post that remains in its channel's queue instead of one
 * post. Only this block type can do so. See `takesRemainingPosts()`. Like other blocks, it gets the
 * first post as `postId` context. Its edit function reads all of the posts with
 * `useChannelQueuePosts()`.
 *
 * An empty channel name means no channel. A block without a channel takes no post. Its context
 * does not change, as if it did not have the support. A Single Post without a channel shows
 * nothing, not even its pin. Inside a block that provides the channel, a block has the channel of
 * that block, so it has none if that block has none. Outside one, it has its own channel. The
 * editor gives the default channel to a new block that does not get the channel of a block around
 * it, and to a block that moves out of such a block. The Channel panel cannot clear the channel. A
 * block has no channel only if no channels are registered, or if its saved content has none. The
 * editor does not give a saved block the default channel when the post opens, so the block shows
 * nothing in the editor, as on the front end, until the user selects a channel.
 *
 * Like on the Query Loop block, a variation of a block in the `wp-curate` namespace can list the
 * controls to show in its `allowedControls` property. The panel ignores this property on the
 * variations of other block types. The only key is `channel`, for the channel picker. Without the
 * property, the panel shows the picker. With an empty array, it does not. Use this for a variation
 * that always uses one channel. The variation must give the `channel` attribute the
 * channel, or the block gets the default channel. The variation must also have an `isActive`
 * property, such as `['namespace']` with its own `namespace` attribute, so the editor can tell
 * which blocks are the variation. The controls of the channel arguments still show.
 *
 * A block type can also list the controls, in an object as the value of its `wp-curate/channels`
 * support. The panel uses this list when the block has no variation list. Give the `channel`
 * attribute a default in the block type, or the block gets the default channel.
 *
 * @example
 * registerBlockVariation('wp-curate/single-post', {
 *   name: 'my-plugin/featured',
 *   title: 'Featured Post',
 *   attributes: {
 *     channel: { name: 'my_plugin_featured' },
 *     namespace: 'my-plugin/featured',
 *   },
 *   allowedControls: [],
 *   isActive: ['namespace'],
 * });
 *
 * @example
 * // block.json
 * {
 *   "attributes": {
 *     "channel": { "type": "object", "default": { "name": "my_plugin_featured" } }
 *   },
 *   "supports": {
 *     "wp-curate/channels": { "allowedControls": [] }
 *   }
 * }
 */

/*
 * Whether each block got the channel of a block around it when it last rendered, by client ID. It
 * is kept outside the component, because a block that moves to another parent mounts again.
 */
const inheritedChannelByBlock = new Map<string, boolean>();

/*
 * The client IDs of blocks that moved out of a block that provides the channel, and wait for the
 * default channel, such as while the list of channels loads.
 */
const movedOutBlocks = new Set<string>();

/**
 * Whether a list of controls allows a control in the Channel panel.
 *
 * @param allowedControls The list of the variation or the block type.
 * @param key             Key of the control.
 */
function isControlAllowed(allowedControls: unknown, key: string): boolean {
  // Every control is allowed if there is no list.
  if (!Array.isArray(allowedControls)) {
    return true;
  }

  return allowedControls.includes(key);
}

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
  attributes,
  blockName,
  channel,
  channelArgs,
  clientId,
  context,
  contextChannel,
  isProvider,
  setAttributes,
  takesRemaining,
}: {
  attributes: Record<string, unknown>;
  blockName: string;
  channel: string;
  channelArgs: Record<string, unknown>;
  clientId: string;
  context: Record<string, unknown>;
  contextChannel: unknown;
  isProvider: boolean;
  setAttributes: (next: Record<string, unknown>) => void;
  takesRemaining: boolean;
}) {
  // The channel for a new block, or null while the list of channels loads.
  const globalChannel = useSelect((select) => defaultChannel(select), []);

  const argFields = useSelect(
    (select) => channelArgFields(select, channel),
    [channel],
  );

  const allowedControls = useSelect(
    (select) => {
      const {
        getActiveBlockVariation,
        getBlockType: selectBlockType,
      } = select(blocksStore) as any;

      /*
       * Read the variation's list only on the blocks of this plugin. A variation of another
       * block type can have an `allowedControls` property for a different purpose.
       */
      const variation = blockName.startsWith(BLOCK_NAMESPACE)
        ? getActiveBlockVariation(blockName, attributes)
        : null;

      // The list of the active variation takes precedence over the list of the block type.
      if (
        typeof variation === 'object'
        && variation !== null
        && Array.isArray(variation.allowedControls)
      ) {
        return variation.allowedControls;
      }

      return channelBlockSupportSettings(selectBlockType(blockName)).allowedControls;
    },
    [attributes, blockName],
  );

  // The channel context has a value only inside a block that provides it, like Channel Content.
  const isInProvider = toChannelName(contextChannel) !== null;

  const inheritsChannel = isInProvider && !isProvider;

  const {
    __unstableMarkNextChangeAsNotPersistent: markNextChangeAsNotPersistent,
  } = useDispatch(blockEditorStore) as any;

  /*
   * Whether the block is new: it, or a block around it, is the last block inserted, such as from
   * the inserter, a paste, or a duplicate. The editor records only the top-level blocks of an
   * insert, and forgets them when it loads the post's blocks, so a saved block is not new.
   */
  const isJustInserted: boolean = useSelect((select) => {
    const {
      getBlockParents,
      wasBlockJustInserted,
    } = select(blockEditorStore) as any;

    return [clientId, ...getBlockParents(clientId)].some((id: string) => wasBlockJustInserted(id));
  }, [clientId]);

  useEffect(() => {
    if (inheritedChannelByBlock.get(clientId) === true && !inheritsChannel) {
      movedOutBlocks.add(clientId);
    }

    inheritedChannelByBlock.set(clientId, inheritsChannel);

    // A block that keeps its own channel after the move needs none.
    if (channel !== '') {
      movedOutBlocks.delete(clientId);
    }

    if (
      (isJustInserted || movedOutBlocks.has(clientId))
      && !inheritsChannel
      && channel === ''
      && globalChannel !== null
      && globalChannel !== ''
    ) {
      movedOutBlocks.delete(clientId);

      /*
       * Add the channel to the undo step of the insert or move that caused it. As its own step,
       * undoing it would clear the channel, and this effect would set it again.
       */
      markNextChangeAsNotPersistent();
      setAttributes({ channel: { name: globalChannel } });
    }
  }, [
    channel,
    clientId,
    globalChannel,
    inheritsChannel,
    isJustInserted,
    markNextChangeAsNotPersistent,
    setAttributes,
  ]);

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

  if (takesRemaining) {
    help = __('The block shows each post that remains in this channel.', 'wp-curate');
  }

  if (channel === '') {
    help = __('Select a channel for the block to show a post from it.', 'wp-curate');
  }

  if (channel === '' && isProvider) {
    help = __('Select a channel for the blocks inside this block to show posts from it.', 'wp-curate');
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

          setAttributes({ channel: { args: next, name: channel } });
        }}
      >
        {/* A block always has a channel, so the item has no value to reset. */}
        {isControlAllowed(allowedControls, 'channel') ? (
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
        ) : null}

        <ChannelPanelSlot fillProps={fillProps} />
      </ToolsPanel>
    </InspectorControls>
  );
}

/**
 * The edit component of a block that takes a post from its channel, with that post as context.
 *
 * `postId` is null while the channel loads, and 0 when the channel has no posts left. A block
 * without a channel takes no post and keeps the context it has. It uses this component
 * too, so that the block's edit component does not mount again when the block gets a channel.
 */
function BlockEditWithPostFromChannel({
  BlockEdit,
  clientId,
  context: blockContext,
  hasNoChannel,
  props,
}: {
  BlockEdit: React.ComponentType<any>;
  clientId: string;
  context: Record<string, unknown>;
  hasNoChannel: boolean;
  props: Record<string, unknown>;
}) {
  const post = useChannelQueuePost(clientId);

  // The post context for the inner blocks. Each value keeps its identity between renders.
  let innerContext: { postId?: number | null, postType?: string } = LOADING_POST;

  if (post !== null) {
    innerContext = post;
  }

  if (hasNoChannel) {
    innerContext = NO_POST_CONTEXT;
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
      attributes,
      clientId,
      context,
      name,
      setAttributes,
    } = props;

    const {
      channel,
    } = attributes;

    const contextChannel = context[CHANNEL_CONTEXT];

    const blockType = getBlockType(name);

    const ownName = toChannelName(channel);

    if (!hasChannelSupport(blockType) || ownName === null) {
      return <BlockEdit {...props} />;
    }

    const isProvider = isChannelProvider(blockType);
    const takesRemaining = takesRemainingPosts(blockType);

    // Keep the rule matched with the queue walk in `useChannelQueue`.
    const hasNoChannel = toBlockChannel(ownName, contextChannel) === '';

    return (
      <>
        <ChannelControls
          attributes={attributes}
          blockName={name}
          channel={ownName}
          channelArgs={toChannelArgs(channel)}
          clientId={clientId}
          context={context}
          contextChannel={contextChannel}
          isProvider={isProvider}
          setAttributes={setAttributes}
          takesRemaining={takesRemaining}
        />
        {isProvider ? (
          <BlockEdit {...props} />
        ) : (
          <BlockEditWithPostFromChannel
            BlockEdit={BlockEdit}
            clientId={clientId}
            context={context}
            hasNoChannel={hasNoChannel}
            props={props}
          />
        )}
      </>
    );
  },
  'withChannelSupport',
);

addFilter('editor.BlockEdit', 'wp-curate/channel-support', withChannelSupport);
