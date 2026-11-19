// WordPress dependencies.
import { useSelect } from '@wordpress/data';

// Plugin dependencies.
import type { ChannelArgField, AvailableChannel } from '../../entries/block-editor/channelStore';
import type { ChannelSlotPosts } from '../useChannelQueue';

/*
 * The block support of a block that has a channel. wp-curate gives the block a `channel` attribute
 * and a Channel panel. A block that also provides the `wp-curate/channel` context, like Channel
 * Content, gives its channel to the blocks inside it. A block type that gives a `channelSlots`
 * callback, like Single Post and Channel Loop, takes posts from its channel. See `channelSlots()`.
 * A block type that gives a `channelInnerContext` callback gives context to the blocks inside it.
 * See `channelInnerContext()`.
 *
 * Like a block binding, the attribute is an object with the channel `name` and the `args` that the
 * block gives the channel, such as `{ name: 'wp_curate_post_category_latest', args: { term: 7 } }`.
 * An empty name means no channel. The editor gives new blocks the default channel.
 */
export const CHANNEL_SUPPORT = 'wp-curate/channels';

// The block context that holds the channel, in the shape of the `channel` attribute.
export const CHANNEL_CONTEXT = 'wp-curate/channel';

const NO_ARG_FIELDS: Record<string, ChannelArgField> = {};

const NO_ARGS: Record<string, unknown> = {};

const NO_CONTEXT: Record<string, unknown> = {};

/**
 * Whether a block type has the `wp-curate/channels` block support.
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
    const value = (supports as Record<string, unknown>)[CHANNEL_SUPPORT];

    // Like `block_has_support()` in PHP, an object of settings also turns on the support.
    hasSupport = value === true || (typeof value === 'object' && value !== null);
  }

  return hasSupport;
}

/**
 * The settings in the `wp-curate/channels` block support of a block type.
 *
 * @param blockType Block type from the blocks store.
 * @return The settings, or an empty object if the support is `true` or the block type does not
 *         have it.
 */
export function channelBlockSupportSettings(blockType: unknown): Record<string, unknown> {
  let settings: Record<string, unknown> = {};

  if (!hasChannelSupport(blockType)) {
    return settings;
  }

  const {
    supports,
  } = blockType as Record<string, unknown>;

  const value = (supports as Record<string, unknown>)[CHANNEL_SUPPORT];

  if (typeof value === 'object' && value !== null) {
    settings = value as Record<string, unknown>;
  }

  return settings;
}

/**
 * Whether a block type gives its channel to the blocks inside it, like Channel Content.
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
 * The most slots that one block can have.
 *
 * Keep the value matched with `Queues::MAX_SLOTS` in PHP.
 */
export const MAX_CHANNEL_SLOTS = 100;

/**
 * A place for one post in a block that shows posts from its channel.
 */
export interface ChannelSlot {
  /** The pinned post ID, or 0 for the top of the queue. */
  ref: number;
  /**
   * The type of the pinned post, or an empty string if it is not known. A pinned post can be past
   * the IDs that have loaded, so the block can give its type.
   */
  postType: string;
}

const NO_SLOTS: ChannelSlot[] = [];

/**
 * Whether a block type gives a `channelSlots` callback, and so takes posts from its channel.
 *
 * @param blockType Block type from the blocks store.
 */
export function hasChannelSlots(blockType: unknown): boolean {
  let hasSlots = false;

  if (hasChannelSupport(blockType)) {
    const {
      channelSlots: callback,
    } = blockType as Record<string, unknown>;

    hasSlots = typeof callback === 'function';
  }

  return hasSlots;
}

/**
 * Makes a slot from a value that a `channelSlots` callback returns.
 *
 * @param value The value.
 */
function toChannelSlot(value: unknown): ChannelSlot {
  const slot: ChannelSlot = {
    postType: '',
    ref: 0,
  };

  if (typeof value !== 'object' || value === null) {
    return slot;
  }

  const {
    postType,
    ref,
  } = value as Record<string, unknown>;

  if (Number.isInteger(ref) && (ref as number) > 0) {
    slot.ref = ref as number;
  }

  if (slot.ref > 0 && typeof postType === 'string') {
    slot.postType = postType;
  }

  return slot;
}

/**
 * Get the slots of a block: one for each post that the block takes from its channel, in order.
 *
 * A block type that takes posts gives a `channelSlots` function when it registers, next to its
 * `edit` function. The function gets the block's attributes and the context that the block gives
 * its channel, and returns an array with an object for each slot. A slot with a positive integer
 * `ref` pins that post. Other slots take the top of the queue. The function must be pure and
 * synchronous, because the queue walk calls it for each block before any block shows its posts.
 *
 * In PHP, the block takes the same slots when it renders, with `Queues::take()`. Keep the two
 * rules matched.
 *
 * @example
 * registerBlockType(metadata, {
 *   edit,
 *   channelSlots: ({ items }) => items.map(({ postId }) => ({ ref: postId })),
 * });
 *
 * @param blockType  Block type from the blocks store.
 * @param attributes Block attributes.
 * @param context    The context that the block gives its channel.
 * @return The slots, up to `MAX_CHANNEL_SLOTS`, or none if the block type has no callback or the
 *         callback fails.
 */
export function channelSlots(
  blockType: unknown,
  attributes: unknown,
  context: Record<string, unknown>,
): ChannelSlot[] {
  let slots = NO_SLOTS;

  if (!hasChannelSlots(blockType)) {
    return slots;
  }

  const {
    channelSlots: callback,
  } = blockType as Record<string, unknown>;

  let value: unknown;

  try {
    value = (callback as (a: unknown, c: Record<string, unknown>) => unknown)(attributes, context);
  } catch (error) {
    // One block with a broken callback must not stop the blocks after it from showing posts.
    value = undefined;
  }

  if (Array.isArray(value)) {
    slots = value.slice(0, MAX_CHANNEL_SLOTS).map(toChannelSlot);
  }

  return slots;
}

/**
 * Get the context that a block with slots gives the blocks inside it.
 *
 * On the page, the block's `render.php` decides the context of its inner blocks, such as with a
 * `render_block_context` filter. The queue walk cannot run that code, but a channel block inside
 * the block finds its queue from that context. So a block type that changes the context of its
 * inner blocks gives a `channelInnerContext` function when it registers, next to `channelSlots`.
 * The function gets the block's attributes, the context around the block, and the post in each of
 * its slots. It returns an object with the context keys that it sets. The walk merges that object
 * into the context around the block.
 *
 * A block type without the function does not change the context of its inner blocks. This is the
 * same as a block in PHP that adds no context filter. The function must be pure and synchronous,
 * like `channelSlots`.
 *
 * @example
 * registerBlockType(metadata, {
 *   edit,
 *   channelSlots,
 *   // Give each inner block the post in the first slot, or keep the context if it has none.
 *   channelInnerContext: (attributes, context, [post]) => (post !== null ? post : {}),
 * });
 *
 * @param blockType  Block type from the blocks store.
 * @param attributes Block attributes.
 * @param context    The context around the block.
 * @param posts      The post in each slot of the block, with null for an empty slot.
 * @return The context of the inner blocks. It is the context around the block if the block type
 *         has no function, or if the function fails or returns a value that is not an object.
 */
export function channelInnerContext(
  blockType: unknown,
  attributes: unknown,
  context: Record<string, unknown>,
  posts: ChannelSlotPosts,
): Record<string, unknown> {
  if (typeof blockType !== 'object' || blockType === null) {
    return context;
  }

  const {
    channelInnerContext: callback,
  } = blockType as Record<string, unknown>;

  if (typeof callback !== 'function') {
    return context;
  }

  let value: unknown;

  try {
    value = callback(attributes, context, posts);
  } catch (error) {
    // One block with a broken callback must not stop the blocks after it from showing posts.
    value = undefined;
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return context;
  }

  return {
    ...context,
    ...value,
  };
}

/**
 * Get the default channel, which the list of channels marks with `default`.
 *
 * Keep the rules matched with `Default_Channel` in PHP.
 *
 * @param select The data registry's `select`.
 * @return The channel, an empty string if no channels are registered, or null while the list of
 *         channels loads.
 */
export function defaultChannel(select: any): string | null {
  const {
    getAvailableChannels,
  } = select('wp-curate/channels') as any;

  const channels: AvailableChannel[] | null = getAvailableChannels({});

  if (channels === null) {
    return null;
  }

  // With no channels registered, there is no default. That case will be handled later.
  let channel = '';

  channels.forEach(({ default: isDefault, name }) => {
    if (isDefault) {
      channel = name;
    }
  });

  return channel;
}

/**
 * Reads the name in a `channel` attribute or context.
 *
 * @param value The attribute or context.
 * @return The name, an empty string for no channel, or null if the value is not a channel,
 *         such as the context of a block that is not inside a Channel Content block.
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
 * block context, which the nearest Channel Content block around it provides, even if the block has
 * its own from before it moved in. Otherwise it uses its own channel.
 *
 * @param ownName        The name in the block's `channel` attribute.
 * @param contextChannel The `wp-curate/channel` block context.
 * @return The channel, or an empty string if the block has no channel. A block has no channel if
 *         the Channel Content block around it has no channel, or if it is not inside one and has
 *         no channel of its own.
 */
export function toBlockChannel(ownName: string, contextChannel: unknown): string {
  const contextName = toChannelName(contextChannel);

  // A Channel Content block without a channel is an error, so the blocks inside it get no channel.
  if (contextName !== null) {
    return contextName;
  }

  return ownName;
}

/**
 * Get the arguments that a block gives its channel.
 *
 * Like the channel, the block uses the arguments in its block context, which the nearest Channel
 * Content block around it provides, even if the block has its own from before it moved in.
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
 * Get the descriptions of the arguments that a channel accepts, keyed by argument name.
 *
 * @param select The data registry's `select`.
 * @param name   Channel name.
 * @return The descriptions, or none for a channel that accepts no arguments or while the list of
 *         channels loads.
 */
export function channelArgFields(select: any, name: string): Record<string, ChannelArgField> {
  const {
    getAvailableChannels,
  } = select('wp-curate/channels') as any;

  const channels: AvailableChannel[] | null = getAvailableChannels({});

  let fields = NO_ARG_FIELDS;

  if (channels === null) {
    return fields;
  }

  const option = channels.find((channel) => channel.name === name);

  if (option !== undefined) {
    fields = option.args;
  }

  return fields;
}

/**
 * Get the label of a channel, such as "Free-For-All".
 *
 * @param select The data registry's `select`.
 * @param name   Channel name.
 * @return The label, or an empty string for a channel that is not registered or while the list of
 *         channels loads.
 */
export function channelLabel(select: any, name: string): string {
  const {
    getAvailableChannels,
  } = select('wp-curate/channels') as any;

  const channels: AvailableChannel[] | null = getAvailableChannels({});

  let label = '';

  if (channels === null) {
    return label;
  }

  const option = channels.find((channel) => channel.name === name);

  if (option !== undefined) {
    ({
      label,
    } = option);
  }

  return label;
}

/**
 * Get only the values of the block context that some channels read.
 *
 * @param keys    The names of the context values.
 * @param context The block context.
 */
function pickContext(keys: string[], context: Record<string, unknown>): Record<string, unknown> {
  let out = NO_CONTEXT;

  keys.forEach((key) => {
    if (key in context && context[key] !== undefined) {
      out = { ...out, [key]: context[key] };
    }
  });

  return out;
}

/**
 * Get only the values of the block context that a channel reads.
 *
 * Leaving out the others gives every block that uses the channel with the same context the same
 * request and queue, like the queues in PHP.
 *
 * @param select  The data registry's `select`.
 * @param name    Channel name.
 * @param context The block context.
 * @return The context, or none while the list of channels loads.
 */
export function channelContext(
  select: any,
  name: string,
  context: Record<string, unknown>,
): Record<string, unknown> {
  const {
    getAvailableChannels,
  } = select('wp-curate/channels') as any;

  const channels: AvailableChannel[] | null = getAvailableChannels({});

  let keys: string[] = [];

  if (channels === null) {
    return NO_CONTEXT;
  }

  const option = channels.find((channel) => channel.name === name);

  if (option !== undefined) {
    keys = option.uses_context;
  }

  return pickContext(keys, context);
}

/**
 * Get only the values of the block context that any channel reads, which tell which channels the
 * block can select.
 *
 * @param select  The data registry's `select`.
 * @param context The block context.
 * @return The context, or null while the list of channels loads.
 */
export function channelsContext(
  select: any,
  context: Record<string, unknown>,
): Record<string, unknown> | null {
  const {
    getAvailableChannels,
  } = select('wp-curate/channels') as any;

  const channels: AvailableChannel[] | null = getAvailableChannels({});

  if (channels === null) {
    return null;
  }

  const keys = new Set<string>();

  channels.forEach(({ uses_context: usesContext }) => {
    usesContext.forEach((key) => keys.add(key));
  });

  return pickContext([...keys].sort(), context);
}

/**
 * Get only the arguments that a channel accepts, in the order of its descriptions.
 *
 * A block's arguments can include keys that the channel does not accept, such as from hand-written
 * markup or an argument that the channel no longer has. Leaving them out gives every block that
 * uses the same arguments the same request and queue, like the queues in PHP.
 *
 * @param fields The descriptions of the arguments that the channel accepts.
 * @param args   The block's arguments.
 */
export function pickChannelArgs(
  fields: Record<string, ChannelArgField>,
  args: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  Object.keys(fields).forEach((name) => {
    if (name in args) {
      out[name] = args[name];
    }
  });

  return out;
}

/**
 * Whether a block gives its channel a value for each argument that the channel needs. Without
 * them, the channel has no posts. An empty string or an empty list is no value.
 *
 * @param fields The descriptions of the arguments that the channel accepts.
 * @param args   The block's arguments.
 */
export function hasEveryChannelArg(
  fields: Record<string, ChannelArgField>,
  args: Record<string, unknown>,
): boolean {
  return Object.entries(fields).every(([name, { required }]) => (
    !required
    || (
      args[name] !== undefined
      && args[name] !== null
      && args[name] !== ''
      && !(Array.isArray(args[name]) && (args[name] as unknown[]).length === 0)
    )
  ));
}

/**
 * Get the channel that a block uses. See `toBlockChannel()`.
 *
 * @param ownName        The name in the block's `channel` attribute.
 * @param contextChannel The `wp-curate/channel` block context.
 * @return The channel, an empty string if the block has no channel, or null while the list of
 *         channels loads.
 */
export default function useBlockChannel(
  ownName: string,
  contextChannel: unknown,
): string | null {
  return useSelect(
    (select) => {
      const {
        getAvailableChannels,
      } = select('wp-curate/channels') as any;

      /*
       * Wait for the list. Before the list loads, the editor cannot give a new block the default
       * channel, so the block would show that it has no channel.
       */
      if (getAvailableChannels({}) === null) {
        return null;
      }

      return toBlockChannel(ownName, contextChannel);
    },
    [contextChannel, ownName],
  );
}
