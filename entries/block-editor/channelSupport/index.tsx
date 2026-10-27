// Global dependencies.
import React from 'react';

// WordPress dependencies.
import {
  // @ts-expect-error BlockContextProvider not available in types yet.
  BlockContextProvider,
  InspectorControls,
} from '@wordpress/block-editor';
import { getBlockType } from '@wordpress/blocks';
import { PanelBody } from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useSelect } from '@wordpress/data';
import { useEffect, useMemo } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

// Plugin dependencies.
import ChannelSelectControl from '../../../components/ChannelSelectControl';
import useBlockChannel, {
  CHANNEL_CONTEXT,
  hasChannelSupport,
  isChannelProvider,
} from '../../../hooks/useBlockChannel';
import useChannelQueue from '../../../hooks/useChannelQueue';

/*
 * Blocks with the `wp-curate/channel` block support get a Channel panel. A block that provides the
 * channel context, like Many Posts, gives the channel to the blocks inside it. Any other block
 * takes a post from its channel's queue, which it gets as the `postId` and `postType` context. It
 * can pin a post with an integer `ref` attribute, and a `postType` attribute with the pinned post's
 * type. The `Channel_Block_Support` feature in PHP adds the `channel` attribute and the context
 * that the block uses, and gives the block the same post on the front end.
 */

interface ChannelControlsProps {
  channel: string;
  contextChannel: unknown;
  isProvider: boolean;
  setAttributes: (attributes: Record<string, unknown>) => void;
}

/**
 * The Channel panel of a block with the support, which also sets the channel of a new block.
 *
 * A block that takes a post inside a block that provides a channel, like a Single Post in a Many
 * Posts block, always uses that channel, so it has no panel and no channel of its own. A block
 * moved in loses its channel. That is accepted for now.
 */
function ChannelControls({
  channel,
  contextChannel,
  isProvider,
  setAttributes,
}: ChannelControlsProps) {
  // The channel that the block would use without its own: a Many Posts block's, or the post's.
  const inheritedChannel = useBlockChannel('', contextChannel);

  // Only a block that provides the channel context, like Many Posts, gives the editor a string.
  const isInProvider = typeof contextChannel === 'string';

  const inherits = !isProvider && isInProvider;

  useEffect(() => {
    if (inherits && channel !== '') {
      setAttributes({ channel: '' });
    }

    /*
     * Any other new block gets the channel that it would inherit, so that it keeps that channel if
     * the channel above it changes later.
     */
    if (!inherits && channel === '' && inheritedChannel !== null && inheritedChannel !== '') {
      setAttributes({ channel: inheritedChannel });
    }
  }, [channel, inheritedChannel, inherits, setAttributes]);

  if (inherits) {
    return null;
  }

  let help: string = __('The block shows a post from this channel.', 'wp-curate');

  if (isProvider) {
    help = __('The blocks inside this block show posts from this channel.', 'wp-curate');
  }

  return (
    <InspectorControls>
      <PanelBody title={__('WP Curate: Channel', 'wp-curate')}>
        <ChannelSelectControl
          help={help}
          onChange={(next) => setAttributes({ channel: next })}
          value={channel}
        />
      </PanelBody>
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

    if (!hasChannelSupport(blockType) || typeof channel !== 'string') {
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
          channel={channel}
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
