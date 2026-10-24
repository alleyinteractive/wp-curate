// WordPress dependencies.
import apiFetch from '@wordpress/api-fetch';
import { createReduxStore, register } from '@wordpress/data';
import { addQueryArgs } from '@wordpress/url';

// Plugin dependencies.
import type { ChannelRecord } from '../../../hooks/useChannelRecord';

/*
 * The available channels by name and context. Blocks read it by the store name,
 * `wp-curate/channels`, so that it is registered only once, here.
 *
 * core-data is not used because it stores an entity record by its key alone, so the same channel
 * name with different context would overwrite itself.
 */

const channelKey = (name: string, context: object) => JSON.stringify([name, context]);

/**
 * Reads a channel record from a REST API response, which can be another type when the
 * request fails.
 *
 * @param value The response.
 */
function toChannelRecord(value: unknown): ChannelRecord {
  const record: ChannelRecord = {
    entity_kind: '',
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

const store = createReduxStore('wp-curate/channels', {
  reducer(state: Record<string, ChannelRecord> | undefined, action: any) {
    let out: Record<string, ChannelRecord> = {};

    if (state !== undefined) {
      out = state;
    }

    if (action.type === 'RECEIVE_CHANNEL') {
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
    getChannel(state: Record<string, ChannelRecord>, name: string, context: object = {}) {
      const key = channelKey(name, context);
      let record: ChannelRecord | null = null;

      if (key in state) {
        record = state[key];
      }

      return record;
    },
  },
  resolvers: {
    getChannel: (name: string, context: object = {}) => async ({
      dispatch,
    }: any) => {
      const {
        receiveChannel,
      } = dispatch;

      let response: unknown = null;

      try {
        response = await apiFetch({ path: addQueryArgs(`/wp-curate/v1/channels/${name}`, { context }) });
      } catch {
        // A channel that fails to load counts as empty.
      }

      receiveChannel(channelKey(name, context), toChannelRecord(response));
    },
  },
});

register(store);
