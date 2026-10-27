// WordPress dependencies.
import apiFetch from '@wordpress/api-fetch';
import { createReduxStore, register } from '@wordpress/data';
import { addQueryArgs } from '@wordpress/url';

// Plugin dependencies.
import type { ChannelPage, ChannelRecord } from '../../../hooks/useChannelRecord';

/*
 * The list of channels, the channels by name, arguments, and context, and the pages of them that
 * pickers show.
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
 * A field of an argument that a channel reads. `id` is the argument's key, and `type` names the
 * control that the editor shows for it. A type can need more keys, such as `taxonomy`.
 */
export interface ChannelArgField {
  [key: string]: string;
  id: string;
  label: string;
  type: string;
}

/**
 * A channel in the list of channels. `is_default` is true for the global default channel.
 * `arg_fields` lists the arguments that the channel reads.
 */
export interface ChannelOption {
  arg_fields: ChannelArgField[];
  is_default: boolean;
  label: string;
  name: string;
}

interface ChannelState {
  channels: Record<string, ChannelRecord>;
  list: ChannelOption[] | null;
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
    order: 'asc',
    order_label: '',
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

  if (typeof response.has_more === 'boolean') {
    record.has_more = response.has_more;
  }

  if (Array.isArray(response.ids)) {
    record.ids = response.ids.filter((id: unknown): id is number => Number.isInteger(id));
  }

  if (typeof response.label === 'string') {
    record.label = response.label;
  }

  if (response.order === 'asc' || response.order === 'desc') {
    record.order = response.order;
  }

  if (typeof response.order_label === 'string') {
    record.order_label = response.order_label;
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
 * Reads the argument fields of a channel from a REST API response. A field without a string `id`,
 * `label`, and `type` is left out.
 *
 * @param value The `arg_fields` value of the response.
 */
function toChannelArgFields(value: unknown): ChannelArgField[] {
  const fields: ChannelArgField[] = [];

  if (!Array.isArray(value)) {
    return fields;
  }

  value.forEach((item: unknown) => {
    if (typeof item !== 'object' || item === null) {
      return;
    }

    const field: Record<string, string> = {};

    Object.entries(item).forEach(([key, fieldValue]) => {
      if (typeof fieldValue === 'string') {
        field[key] = fieldValue;
      }
    });

    const {
      id,
      label,
      type,
    } = field;

    if (id !== undefined && label !== undefined && type !== undefined) {
      fields.push({
        ...field,
        id,
        label,
        type,
      });
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
      arg_fields: argFields,
      is_default: isDefault,
      label,
      name,
    } = item as Record<string, unknown>;

    if (typeof label === 'string' && typeof name === 'string') {
      options.push({
        arg_fields: toChannelArgFields(argFields),
        is_default: isDefault === true,
        label,
        name,
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

  return {
    ...toChannelRecord(body),
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
    order,
    order_label: orderLabel,
    uses_context: usesContext,
  } = pageRecords[0];

  // Join the pages through the first page that has no more IDs after it. The record has no totals,
  // because the queue does not use them.
  const record: ChannelRecord = {
    entity_kind: entityKind,
    has_more: false,
    ids: [],
    label,
    order,
    order_label: orderLabel,
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
 * Loads the list of channels.
 */
const loadChannels = () => async ({
  dispatch,
}: any) => {
  const {
    receiveChannels,
  } = dispatch;

  let response: unknown = null;

  try {
    response = await apiFetch({ path: '/wp-curate/v1/channels' });
  } catch {
    // A list that fails to load counts as empty.
  }

  receiveChannels(toChannelOptions(response));
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
  },
  selectors: {
    getChannel,
    getChannelPage,
    getChannelPostType,
    getChannels,
  },
  resolvers: {
    getChannel: getChannelResolver,
    getChannelPage: getChannelPageResolver,
    getChannels: loadChannels,
  },
});

register(store);
