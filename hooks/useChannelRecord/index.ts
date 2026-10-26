// WordPress dependencies.
import { useSelect } from '@wordpress/data';

/**
 * Number of IDs in a page of a channel. Callers ask for whole pages so that their requests match.
 */
export const CHANNEL_PAGE_SIZE = 10;

/**
 * A channel from the `wp-curate/channels` store.
 *
 * `ids` holds the IDs that have loaded so far, in channel order. `has_more` is true when the
 * channel has more IDs after them.
 */
export interface ChannelRecord {
  entity_kind: string;
  has_more: boolean;
  ids: number[];
  label: string;
  order: 'asc' | 'desc';
  order_label: string;
  post_types: Record<string, string>;
  uses_context: string[];
}

/**
 * A page of a channel from the `wp-curate/channels` store.
 *
 * `total` and `total_pages` count the IDs and pages in the whole channel, or in its matches for a
 * search.
 */
export interface ChannelPage extends ChannelRecord {
  total: number;
  total_pages: number;
}

/**
 * Get the record of a block's channel.
 *
 * @param name    The block's channel, or an empty string if it has none.
 * @param context Block context to send to the channel.
 * @param count   Number of IDs to load, as a multiple of `CHANNEL_PAGE_SIZE`.
 * @return The record, or null while the channel loads or if there is no channel.
 */
export default function useChannelRecord(
  name: string,
  context: Record<string, unknown> = {},
  count: number = CHANNEL_PAGE_SIZE,
): ChannelRecord | null {
  // Compare the context by value, since callers pass a new object on each render.
  const contextKey = JSON.stringify(context);

  return useSelect((select) => {
    const {
      getChannel,
    } = select('wp-curate/channels') as any;

    let record: ChannelRecord | null = null;

    // Without a channel, there is nothing to request.
    if (name !== '') {
      record = getChannel(name, JSON.parse(contextKey), count);
    }

    return record;
  }, [count, name, contextKey]);
}
