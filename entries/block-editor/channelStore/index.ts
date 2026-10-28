// WordPress dependencies.
import apiFetch from '@wordpress/api-fetch';
import { createReduxStore, register } from '@wordpress/data';
import { addQueryArgs } from '@wordpress/url';

// Plugin dependencies.
import type { ChannelPage, ChannelRecord } from '../../../hooks/useChannelRecord';

/*
 * The list of channels, alone and for each block context, the channels by name, arguments, and
 * context, and the pages of them that pickers show.
 * Blocks read it by the store name, `wp-curate/channels`, so that it is registered only once, here.
 *
 * core-data is not used because it stores an entity record by its key alone, so the same channel
 * name with different arguments or context would overwrite itself.
 *
 * A channel record holds only as many IDs as blocks have asked for. Asking for more loads the
 * channel again from its start, through the new count, so that the queue reads the IDs in one
 * order. A page record holds one page, which a picker can load by itself, and the channel's totals.
 */

// The most IDs that the REST API returns in one page.
const MAX_PER_PAGE = 100;

/**
 * The description of an argument that a channel reads. `required` is true for an argument that the
 * channel needs. The fill of the Channel panel for the channel reads the other keys, such as the
 * `taxonomy` of a term argument. See `Channel::args()` in PHP.
 */
export interface ChannelArgField {
  [key: string]: unknown;
  label: string;
  required: boolean;
}

/**
 * A channel in the list of channels. `default` is true for the global default channel. `args`
 * describes the arguments that the channel reads, keyed by argument name, and `uses_context` lists
 * the block context that it reads. `available` tells whether a block with the context of the
 * list can select the channel.
 */
export interface ChannelOption {
  args: Record<string, ChannelArgField>;
  available: boolean;
  default: boolean;
  label: string;
  name: string;
  uses_context: string[];
}

interface ChannelState {
  channels: Record<string, ChannelRecord>;
  list: ChannelOption[] | null;
  listsInContext: Record<string, ChannelOption[]>;
  pages: Record<string, ChannelPage>;
}

/**
 * The key of a stored channel record.
 *
 * @param name    Channel name.
 * @param args    Block arguments sent to the channel.
 * @param context Block context sent to the channel.
 */
const channelKey = (
  name: string,
  args: object,
  context: object,
) => JSON.stringify([name, args, context]);

/**
 * The key of a stored page record.
 *
 * @param name    Channel name.
 * @param args    Block arguments sent to the channel.
 * @param context Block context sent to the channel.
 * @param search  Search terms, or an empty string for the whole channel.
 * @param page    Page number.
 * @param perPage Number of IDs in a page.
 */
const pageKey = (
  name: string,
  args: object,
  context: object,
  search: string,
  page: number,
  perPage: number,
) => JSON.stringify([name, args, context, search, page, perPage]);

/**
 * Reads a stored record, if it has at least the number of IDs, or if the channel has no more IDs
 * to load.
 *
 * @param state Store state.
 * @param key   Key of the record.
 * @param count Number of IDs.
 */
function toLoadedChannel(
  state: Record<string, ChannelRecord>,
  key: string,
  count: number,
): ChannelRecord | null {
  let stored: ChannelRecord | null = null;
  let record: ChannelRecord | null = null;

  if (key in state) {
    stored = state[key];
  }

  if (stored !== null && stored.ids.length >= count) {
    record = stored;
  }

  if (stored !== null && !stored.has_more) {
    record = stored;
  }

  return record;
}

/**
 * Reads a channel record from a REST API response, which can be another type when the
 * request fails.
 *
 * @param value The response.
 */
function toChannelRecord(value: unknown): ChannelRecord {
  const record: ChannelRecord = {
    entity_kind: '',
    has_more: false,
    ids: [],
    label: '',
    post_types: {},
    uses_context: [],
  };

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return record;
  }

  const response = value as Record<string, unknown>;

  if (typeof response.entity_kind === 'string') {
    record.entity_kind = response.entity_kind;
  }

  if (Array.isArray(response.ids)) {
    record.ids = response.ids.filter((id: unknown): id is number => Number.isInteger(id));
  }

  if (typeof response.label === 'string') {
    record.label = response.label;
  }

  // PHP encodes an empty associative array as a JSON array, so an array means no post types.
  if (
    typeof response.post_types === 'object'
    && response.post_types !== null
    && !Array.isArray(response.post_types)
  ) {
    Object.entries(response.post_types).forEach(([slug, postTypeLabel]) => {
      if (typeof postTypeLabel === 'string') {
        record.post_types[slug] = postTypeLabel;
      }
    });
  }

  if (Array.isArray(response.uses_context)) {
    record.uses_context = response.uses_context.filter(
      (usedKey: unknown): usedKey is string => typeof usedKey === 'string',
    );
  }

  return record;
}

/**
 * Reads the arguments of a channel from a REST API response, keyed by argument name. An argument
 * without a string `label` is left out.
 *
 * @param value The `args` value of the response.
 */
function toChannelArgFields(value: unknown): Record<string, ChannelArgField> {
  const fields: Record<string, ChannelArgField> = {};

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fields;
  }

  Object.entries(value).forEach(([name, item]: [string, unknown]) => {
    if (typeof item !== 'object' || item === null) {
      return;
    }

    const field = item as Record<string, unknown>;

    const {
      label,
      required,
    } = field;

    if (typeof label === 'string') {
      fields[name] = {
        ...field,
        label,
        required: required === true,
      };
    }
  });

  return fields;
}

/**
 * Reads the list of channels from a REST API response, which can be another type when the
 * request fails.
 *
 * @param value The response.
 */
function toChannelOptions(value: unknown): ChannelOption[] {
  const options: ChannelOption[] = [];

  if (!Array.isArray(value)) {
    return options;
  }

  value.forEach((item: unknown) => {
    if (typeof item !== 'object' || item === null) {
      return;
    }

    const {
      args,
      available: isAvailable,
      default: isDefault,
      label,
      name,
      uses_context: usesContext,
    } = item as Record<string, unknown>;

    let usedKeys: string[] = [];

    if (Array.isArray(usesContext)) {
      usedKeys = usesContext.filter((key: unknown): key is string => typeof key === 'string');
    }

    if (typeof label === 'string' && typeof name === 'string') {
      options.push({
        args: toChannelArgFields(args),
        available: isAvailable === true,
        default: isDefault === true,
        label,
        name,
        uses_context: usedKeys,
      });
    }
  });

  return options;
}

/**
 * Reads a whole number from a REST API response header, or 0 if the header is missing or is
 * another value.
 *
 * @param value Header value.
 */
function toHeaderInteger(value: string | null): number {
  let out = 0;

  if (value !== null && /^\d+$/.test(value)) {
    out = Number(value);
  }

  return out;
}

/**
 * Fetches one page of a channel, or of its matches for a search.
 *
 * @param name    Channel name.
 * @param args    Block arguments sent to the channel.
 * @param context Block context sent to the channel.
 * @param search  Search terms, or an empty string for the whole channel.
 * @param page    Page number.
 * @param perPage Number of IDs in a page.
 */
async function fetchChannelPage(
  name: string,
  args: object,
  context: object,
  search: string,
  page: number,
  perPage: number,
): Promise<ChannelPage> {
  const queryArgs: Record<string, unknown> = {
    args,
    context,
    page,
    per_page: perPage,
  };

  let body: unknown = null;
  let total = 0;
  let totalPages = 0;

  if (search !== '') {
    queryArgs.search = search;
  }

  try {
    // Do not parse the response, so that its headers are available.
    const response = await apiFetch<unknown, false>({
      parse: false,
      path: addQueryArgs(`/wp-curate/v1/channels/${name}`, queryArgs),
    });

    total = toHeaderInteger(response.headers.get('X-WP-Total'));
    totalPages = toHeaderInteger(response.headers.get('X-WP-TotalPages'));
    body = await response.json();
  } catch {
    // A page that fails to load counts as empty, which ends the channel.
  }

  // The channel counts the same IDs that it gives, so the page count tells whether more remain.
  return {
    ...toChannelRecord(body),
    has_more: page < totalPages,
    total,
    total_pages: totalPages,
  };
}

/**
 * Loads the first IDs of a channel through the count, in pages of up to `MAX_PER_PAGE`.
 *
 * @param name    Channel name.
 * @param args    Block arguments sent to the channel.
 * @param context Block context sent to the channel.
 * @param count   Number of IDs.
 */
const loadChannel = (
  name: string,
  args: object,
  context: object,
  count: number,
) => async ({
  dispatch,
}: any) => {
  const {
    receiveChannel,
  } = dispatch;

  // Without a count, no pages would load, and the empty record would look like a complete channel.
  if (!Number.isInteger(count) || count < 1) {
    return;
  }

  const perPage = Math.min(count, MAX_PER_PAGE);
  const pages = Array.from({ length: Math.ceil(count / perPage) }, (_, index) => index + 1);

  const pageRecords = await Promise.all(
    pages.map((page) => fetchChannelPage(name, args, context, '', page, perPage)),
  );

  const {
    entity_kind: entityKind,
    label,
    uses_context: usesContext,
  } = pageRecords[0];

  // Join the pages through the first page that has no more IDs after it. The record has no totals,
  // because the queue does not use them.
  const record: ChannelRecord = {
    entity_kind: entityKind,
    has_more: false,
    ids: [],
    label,
    post_types: {},
    uses_context: usesContext,
  };

  let isComplete = false;

  pageRecords.forEach((pageRecord) => {
    if (!isComplete) {
      record.has_more = pageRecord.has_more;
      record.ids = [...record.ids, ...pageRecord.ids];
      record.post_types = { ...record.post_types, ...pageRecord.post_types };
      isComplete = !pageRecord.has_more;
    }
  });

  receiveChannel(channelKey(name, args, context), record);
};

/**
 * Loads one page of a channel, or of its matches for a search.
 *
 * @param name    Channel name.
 * @param args    Block arguments sent to the channel.
 * @param context Block context sent to the channel.
 * @param search  Search terms, or an empty string for the whole channel.
 * @param page    Page number.
 * @param perPage Number of IDs in a page, up to `MAX_PER_PAGE`.
 */
const loadChannelPage = (
  name: string,
  args: object,
  context: object,
  search: string,
  page: number,
  perPage: number,
) => async ({
  dispatch,
}: any) => {
  const {
    receiveChannelPage,
  } = dispatch;

  // The REST API rejects these, so skip the request.
  if (
    !Number.isInteger(page)
    || page < 1
    || !Number.isInteger(perPage)
    || perPage < 1
    || perPage > MAX_PER_PAGE
  ) {
    return;
  }

  receiveChannelPage(
    pageKey(name, args, context, search, page, perPage),
    await fetchChannelPage(name, args, context, search, page, perPage),
  );
};

/**
 * Fetches the list of channels.
 *
 * @param context Block context, which tells whether a block can select each channel.
 */
async function fetchChannels(context: object): Promise<ChannelOption[]> {
  let response: unknown = null;

  try {
    response = await apiFetch({ path: addQueryArgs('/wp-curate/v1/channels', { context }) });
  } catch {
    // A list that fails to load counts as empty.
  }

  return toChannelOptions(response);
}

/**
 * Loads the list of channels.
 */
const loadChannels = () => async ({
  dispatch,
}: any) => {
  const {
    receiveChannels,
  } = dispatch;

  receiveChannels(await fetchChannels({}));
};

/**
 * Loads the list of channels for a block context.
 *
 * @param context Block context.
 */
const loadChannelsInContext = (context: object) => async ({
  dispatch,
}: any) => {
  const {
    receiveChannelsInContext,
  } = dispatch;

  receiveChannelsInContext(JSON.stringify(context), await fetchChannels(context));
};

/**
 * Get the record of a channel.
 *
 * The arguments have no defaults, so that callers pass all of them. The data registry keys each
 * resolution by its exact arguments, so a call that left one out would send a second request
 * for the same IDs.
 *
 * @param state   Store state.
 * @param name    Channel name.
 * @param args    Block arguments sent to the channel.
 * @param context Block context sent to the channel.
 * @param count   Number of IDs, as a multiple of `CHANNEL_PAGE_SIZE`.
 * @return The record, or null until it has the number of IDs.
 */
const getChannel = (
  state: ChannelState,
  name: string,
  args: object,
  context: object,
  count: number,
) => toLoadedChannel(state.channels, channelKey(name, args, context), count);

/**
 * Get one page of a channel, or of its matches for a search.
 *
 * Like `getChannel()`, the arguments have no defaults, so that callers pass all of them.
 *
 * @param state   Store state.
 * @param name    Channel name.
 * @param args    Block arguments sent to the channel.
 * @param context Block context sent to the channel.
 * @param search  Search terms, or an empty string for the whole channel.
 * @param page    Page number.
 * @param perPage Number of IDs in a page, up to `MAX_PER_PAGE`.
 * @return The page, or null until it loads.
 */
const getChannelPage = (
  state: ChannelState,
  name: string,
  args: object,
  context: object,
  search: string,
  page: number,
  perPage: number,
) => {
  const key = pageKey(name, args, context, search, page, perPage);
  let record: ChannelPage | null = null;

  if (key in state.pages) {
    record = state.pages[key];
  }

  return record;
};

/**
 * Get the post type of a post in any channel or page that has loaded.
 *
 * It loads nothing.
 *
 * @param state Store state.
 * @param id    Post ID.
 * @return The post type, or an empty string if no channel or page has the post.
 */
const getChannelPostType = (
  state: ChannelState,
  id: number,
) => {
  let postType = '';

  [...Object.values(state.channels), ...Object.values(state.pages)].forEach(({
    post_types: postTypes,
  }) => {
    if (id in postTypes) {
      postType = postTypes[id];
    }
  });

  return postType;
};

/**
 * Get the name and label of each channel.
 *
 * @param state Store state.
 * @return The channels, or null until they load.
 */
const getChannels = (state: ChannelState) => state.list;

/**
 * Get the channels, with whether a block with the context can select each one.
 *
 * Pass only the context that the channels use, so that blocks with the same context share one
 * request.
 *
 * @param state   Store state.
 * @param context Block context.
 * @return The channels, or null until they load.
 */
const getChannelsInContext = (state: ChannelState, context: object) => {
  const key = JSON.stringify(context);
  let list: ChannelOption[] | null = null;

  if (key in state.listsInContext) {
    list = state.listsInContext[key];
  }

  return list;
};

const getChannelResolver = (
  name: string,
  args: object,
  context: object,
  count: number,
) => loadChannel(name, args, context, count);

const getChannelPageResolver = (
  name: string,
  args: object,
  context: object,
  search: string,
  page: number,
  perPage: number,
) => loadChannelPage(name, args, context, search, page, perPage);

// Skip the request when the store already has enough IDs.
getChannelResolver.isFulfilled = (
  state: ChannelState,
  name: string,
  args: object,
  context: object,
  count: number,
) => getChannel(state, name, args, context, count) !== null;

getChannelPageResolver.isFulfilled = (
  state: ChannelState,
  name: string,
  args: object,
  context: object,
  search: string,
  page: number,
  perPage: number,
) => getChannelPage(state, name, args, context, search, page, perPage) !== null;

const store = createReduxStore('wp-curate/channels', {
  reducer(state: ChannelState | undefined, action: any) {
    let out: ChannelState = {
      channels: {},
      list: null,
      listsInContext: {},
      pages: {},
    };

    if (state !== undefined) {
      out = state;
    }

    let isLonger = true;

    // Requests for different counts can finish in any order, so keep the record with more IDs.
    if (action.type === 'RECEIVE_CHANNEL' && action.key in out.channels) {
      isLonger = action.record.ids.length >= out.channels[action.key].ids.length;
    }

    if (action.type === 'RECEIVE_CHANNEL' && isLonger) {
      out = {
        ...out,
        channels: { ...out.channels, [action.key]: action.record },
      };
    }

    if (action.type === 'RECEIVE_CHANNELS') {
      out = {
        ...out,
        list: action.list,
      };
    }

    if (action.type === 'RECEIVE_CHANNELS_IN_CONTEXT') {
      out = {
        ...out,
        listsInContext: { ...out.listsInContext, [action.key]: action.list },
      };
    }

    if (action.type === 'RECEIVE_CHANNEL_PAGE') {
      out = {
        ...out,
        pages: { ...out.pages, [action.key]: action.page },
      };
    }

    return out;
  },
  actions: {
    receiveChannel(key: string, record: ChannelRecord) {
      return { key, record, type: 'RECEIVE_CHANNEL' };
    },
    receiveChannelPage(key: string, page: ChannelPage) {
      return { key, page, type: 'RECEIVE_CHANNEL_PAGE' };
    },
    receiveChannels(list: ChannelOption[]) {
      return { list, type: 'RECEIVE_CHANNELS' };
    },
    receiveChannelsInContext(key: string, list: ChannelOption[]) {
      return { key, list, type: 'RECEIVE_CHANNELS_IN_CONTEXT' };
    },
  },
  selectors: {
    getChannel,
    getChannelPage,
    getChannelPostType,
    getChannels,
    getChannelsInContext,
  },
  resolvers: {
    getChannel: getChannelResolver,
    getChannelPage: getChannelPageResolver,
    getChannels: loadChannels,
    getChannelsInContext: loadChannelsInContext,
  },
});

register(store);
