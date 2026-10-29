// WordPress dependencies.
import apiFetch from '@wordpress/api-fetch';
import { createReduxStore, register } from '@wordpress/data';
import { addQueryArgs } from '@wordpress/url';

// Plugin dependencies.
import type { ChannelResultsPage, ChannelResults } from '../../../hooks/useChannelResults';

/*
 * The lists of channels for each block context, the channels by name, arguments, and context, and
 * the pages of them that pickers show.
 *
 * core-data is not used because it stores an entity record by its key alone, so the same channel
 * name with different arguments or context would overwrite itself.
 *
 * Channel results hold only as many IDs as blocks have asked for. Asking for more loads the
 * channel again from its start, through the new count, so that the queue reads the IDs in one
 * order. A results page holds one page, which a picker can load by itself, and the channel's
 * totals.
 */

// The most IDs that the REST API returns in one page.
const MAX_PER_PAGE = 100;

/**
 * The description of an argument that is passed to a channel.
 */
export interface ChannelArgField {
  [key: string]: unknown;
  label: string;
  required: boolean;
}

/**
 * A channel in the list of channels.
 *
 * In PHP, `Available_Channels` is every channel from the `wp_curate_channels` filter. Here, the
 * list holds only the channels that the current user can read, as `Channel::can_read()` says.
 * `eligible` depends on the block context of the request, and `default` on the other registered
 * channels, so neither describes the channel by itself.
 */
export interface AvailableChannel {
  /** The descriptions of the arguments that the channel accepts, keyed by argument name. */
  args: Record<string, ChannelArgField>;
  /** Whether the channel is the global default channel. */
  default: boolean;
  /** Whether a block with the context of the list can select the channel. */
  eligible: boolean;
  label: string;
  name: string;
  /** The block context that the channel reads. */
  uses_context: string[];
}

interface ChannelState {
  channels: Record<string, ChannelResults>;
  lists: Record<string, AvailableChannel[]>;
  pages: Record<string, ChannelResultsPage>;
}

/**
 * The key of stored channel results.
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
 * The key of a stored results page.
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
 * Reads stored results, if they have at least the number of IDs, or if the channel has no more IDs
 * to load.
 *
 * @param state Store state.
 * @param key   Key of the results.
 * @param count Number of IDs.
 */
function toLoadedChannel(
  state: Record<string, ChannelResults>,
  key: string,
  count: number,
): ChannelResults | null {
  let stored: ChannelResults | null = null;
  let results: ChannelResults | null = null;

  if (key in state) {
    stored = state[key];
  }

  if (stored !== null && stored.ids.length >= count) {
    results = stored;
  }

  if (stored !== null && !stored.has_more) {
    results = stored;
  }

  return results;
}

/**
 * Reads channel results from a REST API response, which can be another type when the
 * request fails.
 *
 * @param value The response.
 */
function toChannelResults(value: unknown): ChannelResults {
  const results: ChannelResults = {
    entity_kind: '',
    has_more: false,
    ids: [],
    label: '',
    post_types: {},
    uses_context: [],
  };

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return results;
  }

  const response = value as Record<string, unknown>;

  if (typeof response.entity_kind === 'string') {
    results.entity_kind = response.entity_kind;
  }

  if (Array.isArray(response.ids)) {
    results.ids = response.ids.filter((id: unknown): id is number => Number.isInteger(id));
  }

  if (typeof response.label === 'string') {
    results.label = response.label;
  }

  // PHP encodes an empty associative array as a JSON array, so an array means no post types.
  if (
    typeof response.post_types === 'object'
    && response.post_types !== null
    && !Array.isArray(response.post_types)
  ) {
    Object.entries(response.post_types).forEach(([slug, postTypeLabel]) => {
      if (typeof postTypeLabel === 'string') {
        results.post_types[slug] = postTypeLabel;
      }
    });
  }

  if (Array.isArray(response.uses_context)) {
    results.uses_context = response.uses_context.filter(
      (usedKey: unknown): usedKey is string => typeof usedKey === 'string',
    );
  }

  return results;
}

/**
 * Reads the descriptions of a channel's arguments from a REST API response, keyed by argument
 * name. A description without a string `label` is left out.
 *
 * @param value The `args` value of the response.
 */
function toFieldsForChannelArgs(value: unknown): Record<string, ChannelArgField> {
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
function toAvailableChannels(value: unknown): AvailableChannel[] {
  const channels: AvailableChannel[] = [];

  if (!Array.isArray(value)) {
    return channels;
  }

  value.forEach((item: unknown) => {
    if (typeof item !== 'object' || item === null) {
      return;
    }

    const {
      args,
      eligible: isEligible,
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
      channels.push({
        args: toFieldsForChannelArgs(args),
        eligible: isEligible === true,
        default: isDefault === true,
        label,
        name,
        uses_context: usedKeys,
      });
    }
  });

  return channels;
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
 * Fetches one page of a channel.
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
): Promise<ChannelResultsPage> {
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
    ...toChannelResults(body),
    has_more: page < totalPages,
    total,
    total_pages: totalPages,
  };
}

/**
 * Loads the first IDs of a channel up to the given `count`, in pages of up to `MAX_PER_PAGE`.
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

  // Without a count, no pages would load, the channel would appear to use them.
  if (!Number.isInteger(count) || count < 1) {
    return;
  }

  const perPage = Math.min(count, MAX_PER_PAGE);
  const pages = Array.from({ length: Math.ceil(count / perPage) }, (_, index) => index + 1);

  const resultsPages = await Promise.all(
    pages.map((page) => fetchChannelPage(name, args, context, '', page, perPage)),
  );

  const {
    entity_kind: entityKind,
    label,
    uses_context: usesContext,
  } = resultsPages[0];

  // No totals, because the queue does not use them.
  const results: ChannelResults = {
    entity_kind: entityKind,
    has_more: false,
    ids: [],
    label,
    post_types: {},
    uses_context: usesContext,
  };

  // Join the pages, and stop after the channel's last page.
  let isComplete = false;

  resultsPages.forEach((resultsPage) => {
    if (!isComplete) {
      results.has_more = resultsPage.has_more;
      results.ids = [...results.ids, ...resultsPage.ids];
      results.post_types = { ...results.post_types, ...resultsPage.post_types };
      isComplete = !resultsPage.has_more;
    }
  });

  receiveChannel(channelKey(name, args, context), results);
};

/**
 * Loads one page of a channel.
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
async function fetchChannels(context: object): Promise<AvailableChannel[]> {
  let response: unknown = null;

  try {
    response = await apiFetch({ path: addQueryArgs('/wp-curate/v1/channels', { context }) });
  } catch {
    // A list that fails to load counts as empty.
  }

  return toAvailableChannels(response);
}

/**
 * Loads the list of channels for a block context.
 *
 * @param context Block context.
 */
const loadChannels = (context: object) => async ({
  dispatch,
}: any) => {
  const {
    receiveChannels,
  } = dispatch;

  receiveChannels(JSON.stringify(context), await fetchChannels(context));
};

/**
 * Get the results of a channel.
 *
 * The arguments have no defaults so that callers pass all of them. The data registry keys each
 * resolution by its exact arguments, so a call that left one out would send a second request
 * for the same IDs.
 *
 * @param state   Store state.
 * @param name    Channel name.
 * @param args    Block arguments sent to the channel.
 * @param context Block context sent to the channel.
 * @param count   Number of IDs, as a multiple of `CHANNEL_PAGE_SIZE`.
 * @return The results, or null until they have the number of IDs.
 */
const getChannel = (
  state: ChannelState,
  name: string,
  args: object,
  context: object,
  count: number,
) => toLoadedChannel(state.channels, channelKey(name, args, context), count);

/**
 * Get one page of a channel.
 *
 * Like `getChannel()`, the arguments have no defaults so that callers pass all of them.
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
  let resultsPage: ChannelResultsPage | null = null;

  if (key in state.pages) {
    resultsPage = state.pages[key];
  }

  return resultsPage;
};

/**
 * Get the type of a post that came with any channel results that the store has loaded.
 *
 * The REST API gives each post's type with the IDs, because a channel can mix post types. This
 * loads nothing.
 *
 * @param state Store state.
 * @param id    Post ID.
 * @return The post type, or an empty string if no loaded results have the post.
 */
const getTypeOfPostInChannel = (
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
 * Get the channels, each marked as eligible or not for a block context.
 *
 * Pass `{}` for the list without a block context. Like `getChannel()`, the context has no default,
 * so that callers pass it. Pass only the context that the channels use, so that blocks with the
 * same context share one request.
 *
 * @param state   Store state.
 * @param context Block context.
 * @return The channels, or null until they load.
 */
const getChannels = (state: ChannelState, context: object) => {
  const key = JSON.stringify(context);
  let list: AvailableChannel[] | null = null;

  if (key in state.lists) {
    list = state.lists[key];
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
      lists: {},
      pages: {},
    };

    if (state !== undefined) {
      out = state;
    }

    let isLonger = true;

    // Requests for different counts can finish in any order, so keep the results with more IDs.
    if (action.type === 'RECEIVE_CHANNEL' && action.key in out.channels) {
      isLonger = action.results.ids.length >= out.channels[action.key].ids.length;
    }

    if (action.type === 'RECEIVE_CHANNEL' && isLonger) {
      out = {
        ...out,
        channels: { ...out.channels, [action.key]: action.results },
      };
    }

    if (action.type === 'RECEIVE_CHANNELS') {
      out = {
        ...out,
        lists: { ...out.lists, [action.key]: action.list },
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
    receiveChannel(key: string, results: ChannelResults) {
      return { key, results, type: 'RECEIVE_CHANNEL' };
    },
    receiveChannelPage(key: string, page: ChannelResultsPage) {
      return { key, page, type: 'RECEIVE_CHANNEL_PAGE' };
    },
    receiveChannels(key: string, list: AvailableChannel[]) {
      return { key, list, type: 'RECEIVE_CHANNELS' };
    },
  },
  selectors: {
    getChannel,
    getChannelPage,
    getTypeOfPostInChannel,
    getChannels,
  },
  resolvers: {
    getChannel: getChannelResolver,
    getChannelPage: getChannelPageResolver,
    getChannels: loadChannels,
  },
});

register(store);
