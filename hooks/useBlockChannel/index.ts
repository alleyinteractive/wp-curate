// WordPress dependencies.
import { useSelect } from '@wordpress/data';

// Plugin dependencies.
import type { ChannelArgField, ChannelOption } from '../../entries/block-editor/channelStore';

/**
 * The post meta key of the post's default channel.
 */
export const DEFAULT_CHANNEL_META_KEY = 'wp_curate_default_channel';

/*
 * The block support of a block that has a channel. wp-curate gives the block a `channel` attribute
 * and a Channel panel. A block that also provides the `wp-curate/channel` context, like Many Posts,
 * gives its channel to the blocks inside it. Any other block takes a post from its channel.
 *
 * Like a block binding, the attribute is an object with the channel `name` and the `args` that the
 * block gives the channel, such as `{ name: 'latest_post_in_category', args: { term: 7 } }`. An
 * empty name means the post's default channel.
 */
export const CHANNEL_SUPPORT = 'wp-curate/channel';

// The block context that holds the channel, in the shape of the `channel` attribute.
export const CHANNEL_CONTEXT = 'wp-curate/channel';

const NO_ARG_FIELDS: ChannelArgField[] = [];

const NO_ARGS: Record<string, unknown> = {};

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
 * A channel that reads arguments cannot be the default, because only a block can give them.
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

  if (channels.some(({ arg_fields: argFields, name }) => (
    name === postChannel && argFields.length === 0
  ))) {
    channel = postChannel;
  }

  return channel;
}

/**
 * Reads the name in a `channel` attribute or context.
 *
 * @param value The attribute or context.
 * @return The name, an empty string for the post's default channel, or null if the value is not a
 *         channel, such as the context of a block that is not inside a Many Posts block.
 */
export function toChannelName(value: unknown): string | null {
  let name: string | null = null;

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return name;
  }

  name = '';

  const {
    name: channelName,
  } = value as Record<string, unknown>;

  if (typeof channelName === 'string') {
    name = channelName;
  }

  return name;
}

/**
 * Reads the arguments in a `channel` attribute or context.
 *
 * @param value The attribute or context.
 * @return The arguments, or none if the value has no object of them.
 */
export function toChannelArgs(value: unknown): Record<string, unknown> {
  let args = NO_ARGS;

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return args;
  }

  const {
    args: channelArgs,
  } = value as Record<string, unknown>;

  if (typeof channelArgs === 'object' && channelArgs !== null && !Array.isArray(channelArgs)) {
    args = channelArgs as Record<string, unknown>;
  }

  return args;
}

/**
 * Get the channel that a block uses.
 *
 * Keep the rules matched with `Channel_Block_Support` in PHP. The block uses the channel in its
 * block context, which a Many Posts block around it provides, even if the block has its own from
 * before it moved in. Otherwise it uses its own channel, or else the post's default channel, or
 * else the global default channel.
 *
 * @param select         The data registry's `select`.
 * @param ownName        The name in the block's `channel` attribute.
 * @param contextChannel The `wp-curate/channel` block context.
 * @return The channel, an empty string if no channels are registered or the Many Posts block around
 *         the block has no channel, or null while the list of channels loads.
 */
export function toBlockChannel(
  select: any,
  ownName: string,
  contextChannel: unknown,
): string | null {
  const contextName = toChannelName(contextChannel);

  // A Many Posts block without a channel is an error, so the blocks inside it get no channel.
  if (contextName !== null) {
    return contextName;
  }

  let channel: string | null = ownName;

  if (channel === '') {
    channel = postDefaultChannel(select);
  }

  return channel;
}

/**
 * Get the arguments that a block gives its channel.
 *
 * Like the channel, the block uses the arguments in its block context, which a Many Posts block
 * around it provides, even if the block has its own from before it moved in.
 *
 * @param ownChannel     The block's `channel` attribute.
 * @param contextChannel The `wp-curate/channel` block context.
 */
export function toBlockChannelArgs(
  ownChannel: unknown,
  contextChannel: unknown,
): Record<string, unknown> {
  let args = toChannelArgs(ownChannel);

  if (toChannelName(contextChannel) !== null) {
    args = toChannelArgs(contextChannel);
  }

  return args;
}

/**
 * Get the fields of the arguments that a channel reads.
 *
 * @param select The data registry's `select`.
 * @param name   Channel name.
 * @return The fields, or none for a channel that reads no arguments or while the list of channels
 *         loads.
 */
export function channelArgFields(select: any, name: string): ChannelArgField[] {
  const {
    getChannels,
  } = select('wp-curate/channels') as any;

  const channels: ChannelOption[] | null = getChannels();

  let fields = NO_ARG_FIELDS;

  if (channels === null) {
    return fields;
  }

  const option = channels.find((channel) => channel.name === name);

  if (option !== undefined) {
    fields = option.arg_fields;
  }

  return fields;
}

/**
 * Get only the arguments that a channel reads, in the order of its fields.
 *
 * A block's arguments can include keys that the channel does not read, such as from hand-written
 * markup or a field that the channel no longer has. Leaving them out gives every block that uses
 * the same arguments the same request and queue, like the queues in PHP.
 *
 * @param fields The fields of the arguments that the channel reads.
 * @param args   The block's arguments.
 */
export function pickChannelArgs(
  fields: ChannelArgField[],
  args: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  fields.forEach(({ id }) => {
    if (id in args) {
      out[id] = args[id];
    }
  });

  return out;
}

/**
 * Whether a block gives its channel a value for each argument that the channel reads. Without
 * them, the channel has no posts.
 *
 * @param fields The fields of the arguments that the channel reads.
 * @param args   The block's arguments.
 */
export function hasEveryChannelArg(
  fields: ChannelArgField[],
  args: Record<string, unknown>,
): boolean {
  return fields.every(({ id }) => (
    args[id] !== undefined && args[id] !== null && args[id] !== ''
  ));
}

/**
 * Get the channel that a block uses.
 *
 * @param ownName        The name in the block's `channel` attribute.
 * @param contextChannel The `wp-curate/channel` block context.
 * @return The channel, an empty string if no channels are registered, or null while the list of
 *         channels loads.
 */
export default function useBlockChannel(
  ownName: string,
  contextChannel: unknown,
): string | null {
  return useSelect(
    (select) => toBlockChannel(select, ownName, contextChannel),
    [contextChannel, ownName],
  );
}
