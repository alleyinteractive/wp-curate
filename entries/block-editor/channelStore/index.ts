// WordPress dependencies.
import apiFetch from '@wordpress/api-fetch';
import { createReduxStore, register } from '@wordpress/data';
import { addQueryArgs } from '@wordpress/url';

// Plugin dependencies.
import { CHANNEL_PAGE_SIZE, type ChannelRecord } from '../../../hooks/useChannelRecord';

/*
 * The available channels by name and context. Blocks read it by the store name,
 * `wp-curate/channels`, so that it is registered only once, here.
 *
 * core-data is not used because it stores an entity record by its key alone, so the same channel
 * name with different context would overwrite itself.
 *
 * A record holds only as many IDs as blocks have asked for. Asking for more loads the channel
 * again from its start, through the new count.
 */

// The most IDs that the REST API returns in one page.
const MAX_PER_PAGE = 100;

const channelKey = (name: string, context: object) => JSON.stringify([name, context]);

/**
 * Reads the stored record of a channel, if it has at least the number of IDs, or if the channel
 * has no more IDs to load.
 *
 * @param state   Store state.
 * @param name    Channel name.
 * @param context Block context sent to the channel.
 * @param count   Number of IDs.
 */
function toLoadedChannel(
  state: Record<string, ChannelRecord>,
  name: string,
  context: object,
  count: number,
): ChannelRecord | null {
  const key = channelKey(name, context);

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
 * Loads the first IDs of a channel, through the count, in pages of up to `MAX_PER_PAGE`.
 *
 * @param name    Channel name.
 * @param context Block context sent to the channel.
 * @param count   Number of IDs.
 */
const getChannelResolver = (
  name: string,
  context: object = {},
  count: number = CHANNEL_PAGE_SIZE,
) => async ({
  dispatch,
}: any) => {
  const {
    receiveChannel,
  } = dispatch;

  const perPage = Math.min(count, MAX_PER_PAGE);
  const pages = Array.from({ length: Math.ceil(count / perPage) }, (_, index) => index + 1);

  const pageRecords = await Promise.all(pages.map(async (page) => {
    let response: unknown = null;

    try {
      response = await apiFetch({
        path: addQueryArgs(`/wp-curate/v1/channels/${name}`, {
          context,
          page,
          per_page: perPage,
        }),
      });
    } catch {
      // A page that fails to load counts as empty, which ends the channel.
    }

    return toChannelRecord(response);
  }));

  // Join the pages through the first page that has no more IDs after it.
  const record: ChannelRecord = {
    ...pageRecords[0],
    ids: [],
    post_types: {},
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

  receiveChannel(channelKey(name, context), record);
};

// Skip the request when the store already has enough IDs.
getChannelResolver.isFulfilled = (
  state: Record<string, ChannelRecord>,
  name: string,
  context: object = {},
  count: number = CHANNEL_PAGE_SIZE,
) => toLoadedChannel(state, name, context, count) !== null;

const store = createReduxStore('wp-curate/channels', {
  reducer(state: Record<string, ChannelRecord> | undefined, action: any) {
    let out: Record<string, ChannelRecord> = {};

    if (state !== undefined) {
      out = state;
    }

    let isLonger = true;

    // Requests for different counts can finish in any order, so keep the record with more IDs.
    if (action.type === 'RECEIVE_CHANNEL' && action.key in out) {
      isLonger = action.record.ids.length >= out[action.key].ids.length;
    }

    if (action.type === 'RECEIVE_CHANNEL' && isLonger) {
      out = { ...out, [action.key]: action.record };
    }

    return out;
  },
  actions: {
    receiveChannel(key: string, record: ChannelRecord) {
      return { key, record, type: 'RECEIVE_CHANNEL' };
    },
  },
  selectors: {
    getChannel(
      state: Record<string, ChannelRecord>,
      name: string,
      context: object = {},
      count: number = CHANNEL_PAGE_SIZE,
    ) {
      return toLoadedChannel(state, name, context, count);
    },
  },
  resolvers: {
    getChannel: getChannelResolver,
  },
});

register(store);
