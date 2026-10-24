// WordPress dependencies.
import { useSelect } from '@wordpress/data';

/**
 * A channel from the `wp-curate/channels` store.
 */
export interface ChannelRecord {
  entity_kind: string;
  ids: number[];
  label: string;
  order: 'asc' | 'desc';
  order_label: string;
  post_types: Record<string, string>;
  uses_context: string[];
}

/**
 * Get the record of a block's channel.
 *
 * @param name    The block's `channel` attribute.
 * @param context Block context to send to the channel.
 * @return The record, or null while the channel loads.
 */
export default function useChannelRecord(
  name: string,
  context: Record<string, unknown> = {},
): ChannelRecord | null {
  // Compare the context by value, since callers pass a new object on each render.
  const contextKey = JSON.stringify(context);

  return useSelect((select) => {
    const {
      getChannel,
    } = select('wp-curate/channels') as any;

    return getChannel(name, JSON.parse(contextKey)) as ChannelRecord | null;
  }, [name, contextKey]);
}
