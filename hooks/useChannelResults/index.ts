// WordPress dependencies.
import { useSelect } from '@wordpress/data';

/**
 * Number of IDs in a page of a channel. Callers ask for whole pages so that their requests match.
 */
export const CHANNEL_PAGE_SIZE = 10;

/**
 * A channel from the `wp-curate/channels` store.
 */
export interface ChannelResults {
  entity_kind: string;
  /**
   * Whether the channel has more IDs after `ids`, which the store reads from the `X-WP-TotalPages`
   * header.
   */
  has_more: boolean;
  /** The IDs that have loaded so far, in channel order. */
  ids: number[];
  label: string;
  post_types: Record<string, string>;
  uses_context: string[];
}

/**
 * A page of a channel from the `wp-curate/channels` store.
 */
export interface ChannelResultsPage extends ChannelResults {
  /** The number of IDs in the whole channel, or in its matches for a search. */
  total: number;
  /** The number of pages in the whole channel, or in its matches for a search. */
  total_pages: number;
}

/**
 * Get the results of a block's channel.
 *
 * @param name    The block's channel, or an empty string if it has none.
 * @param args    Block arguments to send to the channel.
 * @param context Block context to send to the channel.
 * @param count   Number of IDs to load, as a multiple of `CHANNEL_PAGE_SIZE`.
 * @return The results, or null while the channel loads or if there is no channel.
 */
export default function useChannelResults(
  name: string,
  args: Record<string, unknown> = {},
  context: Record<string, unknown> = {},
  count: number = CHANNEL_PAGE_SIZE,
): ChannelResults | null {
  // Compare the arguments and context by value, since callers pass new objects on each render.
  const argsKey = JSON.stringify(args);
  const contextKey = JSON.stringify(context);

  return useSelect((select) => {
    const {
      getChannelResults,
    } = select('wp-curate/channels') as any;

    let results: ChannelResults | null = null;

    // Without a channel, there is nothing to request.
    if (name !== '') {
      results = getChannelResults(name, JSON.parse(argsKey), JSON.parse(contextKey), count);
    }

    return results;
  }, [argsKey, count, name, contextKey]);
}
