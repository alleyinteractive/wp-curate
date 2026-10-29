// WordPress dependencies.
import { select } from '@wordpress/data';

// Plugin dependencies.
import type { AvailableChannel } from '../../entries/block-editor/channelStore';
import { defaultChannel, toChannelName } from '../../hooks/useBlockChannel';
import customBlockName from '../../services/customBlockName';

/**
 * The block's name in List View, from the label of its channel.
 *
 * A name from the "Rename" option comes first, in List View and the breadcrumb, as core does for
 * blocks without their own label. Without one, the name is the block title while the list of
 * channels loads, or if the channel is not registered.
 *
 * @param attributes      Block attributes.
 * @param options         Label options.
 * @param options.context Where the label shows.
 * @return The name, or undefined to use the block title.
 */
export default function label(
  attributes: Record<string, unknown>,
  {
    context,
  }: { context: string },
): string | undefined {
  let out: string | undefined;

  const customName = customBlockName(attributes);

  if ((context === 'list-view' || context === 'breadcrumb') && customName !== '') {
    return customName;
  }

  if (context !== 'list-view') {
    return out;
  }

  const {
    getChannels,
  } = select('wp-curate/channels') as any;

  const channels: AvailableChannel[] | null = getChannels({});

  let name: string | null = toChannelName(attributes.channel);

  // An empty name means the default channel.
  if (name === '') {
    name = defaultChannel(select);
  }

  if (channels !== null && name !== null && name !== '') {
    const found = channels.find((channel) => channel.name === name);

    if (found !== undefined) {
      out = found.label;
    }
  }

  return out;
}
