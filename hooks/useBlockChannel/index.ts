// WordPress dependencies.
import { useSelect } from '@wordpress/data';

// Plugin dependencies.
import type { ChannelOption } from '../../entries/block-editor/channelStore';

/**
 * The post meta key of the post's default channel.
 */
export const DEFAULT_CHANNEL_META_KEY = 'wp_curate_default_channel';

/*
 * The block support of a block that has a channel. wp-curate gives the block a `channel` attribute
 * and a Channel panel. A block that also provides the `wp-curate/channel` context, like Many Posts,
 * gives its channel to the blocks inside it. Any other block takes a post from its channel.
 */
export const CHANNEL_SUPPORT = 'wp-curate/channel';

// The block context that holds the channel.
export const CHANNEL_CONTEXT = 'wp-curate/channel';

/**
 * Whether a block type has the `wp-curate/channel` block support.
 *
 * @param blockType Block type from the blocks store.
 */
export function hasChannelSupport(blockType: unknown): boolean {
  let hasSupport = false;

  if (typeof blockType !== 'object' || blockType === null) {
    return hasSupport;
  }

  const {
    supports,
  } = blockType as Record<string, unknown>;

  if (typeof supports === 'object' && supports !== null && CHANNEL_SUPPORT in supports) {
    hasSupport = (supports as Record<string, unknown>)[CHANNEL_SUPPORT] === true;
  }

  return hasSupport;
}

/**
 * Whether a block type gives its channel to the blocks inside it, like Many Posts.
 *
 * @param blockType Block type from the blocks store.
 */
export function isChannelProvider(blockType: unknown): boolean {
  let isProvider = false;

  if (!hasChannelSupport(blockType)) {
    return isProvider;
  }

  const {
    providesContext,
  } = blockType as Record<string, unknown>;

  if (typeof providesContext === 'object' && providesContext !== null) {
    isProvider = CHANNEL_CONTEXT in providesContext;
  }

  return isProvider;
}

/**
 * Reads the post's default channel from the editor, or an empty string if the post has none.
 *
 * The REST API gives a post without the meta the global default channel. The meta can name a
 * channel that is no longer registered. A post type without the meta, such as a template, has none.
 *
 * @param select The data registry's `select`.
 */
function toPostMetaChannel(select: any): string {
  // An editor without a post, such as the widgets editor, has no editor store.
  const editor = select('core/editor');

  let channel = '';

  if (typeof editor !== 'object' || editor === null) {
    return channel;
  }

  const {
    getEditedPostAttribute,
  } = editor;

  const meta = getEditedPostAttribute('meta');

  if (typeof meta !== 'object' || meta === null) {
    return channel;
  }

  const {
    [DEFAULT_CHANNEL_META_KEY]: value,
  } = meta as Record<string, unknown>;

  if (typeof value === 'string') {
    channel = value;
  }

  return channel;
}

/**
 * Get the post's default channel if it is registered, or else the global default channel.
 *
 * Keep the rules matched with `Channel_Block_Context` and `Default_Channel` in PHP.
 *
 * @param select The data registry's `select`.
 * @return The channel, an empty string if no channels are registered, or null while the list of
 *         channels loads.
 */
export function postDefaultChannel(select: any): string | null {
  const postChannel = toPostMetaChannel(select);

  const {
    getChannels,
  } = select('wp-curate/channels') as any;

  const channels: ChannelOption[] | null = getChannels();

  if (channels === null) {
    return null;
  }

  // With no channels registered, there is no default. That case will be handled later.
  let channel = '';

  channels.forEach(({ is_default: isDefault, name }) => {
    if (isDefault) {
      channel = name;
    }
  });

  if (channels.some(({ name }) => name === postChannel)) {
    channel = postChannel;
  }

  return channel;
}

/**
 * Get the channel that a block uses.
 *
 * Keep the rules matched with `Channel_Block_Context` in PHP. The block uses its own channel, or
 * else the channel in its block context, which a Many Posts block around it provides, or else the
 * post's default channel, or else the global default channel.
 *
 * @param select         The data registry's `select`.
 * @param ownChannel     The block's `channel` attribute.
 * @param contextChannel The `wp-curate/channel` block context.
 * @return The channel, an empty string if no channels are registered or the Many Posts block around
 *         the block has no channel, or null while the list of channels loads.
 */
export function toBlockChannel(
  select: any,
  ownChannel: string,
  contextChannel: unknown,
): string | null {
  let channel: string | null = ownChannel;

  // A Many Posts block without a channel is an error, so the blocks inside it get no channel.
  if (channel === '' && typeof contextChannel === 'string') {
    return contextChannel;
  }

  if (channel === '') {
    channel = postDefaultChannel(select);
  }

  return channel;
}

/**
 * Get the channel that a block uses.
 *
 * @param ownChannel     The block's `channel` attribute.
 * @param contextChannel The `wp-curate/channel` block context.
 * @return The channel, an empty string if no channels are registered, or null while the list of
 *         channels loads.
 */
export default function useBlockChannel(
  ownChannel: string,
  contextChannel: unknown,
): string | null {
  return useSelect(
    (select) => toBlockChannel(select, ownChannel, contextChannel),
    [contextChannel, ownChannel],
  );
}
