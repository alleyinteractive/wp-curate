// WordPress dependencies.
import { select } from '@wordpress/data';

// Plugin dependencies.
import { channelLabel, toChannelName } from '../../hooks/useBlockChannel';
import customBlockName from '../../services/customBlockName';

/**
 * The block's name in List View, from the label of its channel.
 *
 * A name from the "Rename" option comes first, in List View and the breadcrumb, as core does for
 * blocks without their own label. Without one, the name is the block title while the list of
 * channels loads, if the block has no channel, or if the channel is not registered.
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

  const name = toChannelName(attributes.channel);

  let channelTitle = '';

  if (name !== null && name !== '') {
    channelTitle = channelLabel(select, name);
  }

  if (channelTitle !== '') {
    out = channelTitle;
  }

  return out;
}
