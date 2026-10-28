// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { __experimentalToolsPanelItem as ToolsPanelItem } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

// Plugin dependencies.
import { ChannelPanelFill } from '../../../components/ChannelPanelSlotFill';
import type { ChannelPanelFillProps } from '../../../components/ChannelPanelSlotFill';
import TermControl from '../../../components/TermControl';

/**
 * Get the arguments without one of them.
 *
 * @param args The arguments.
 * @param id   The key of the argument to leave out.
 */
function withoutArg(args: Record<string, unknown>, id: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(args).filter(([key]) => key !== id));
}

/**
 * A panel item with a term picker for the `term` argument of a "Latest Posts in Term" channel.
 *
 * The channel is named `{post_type}_{taxonomy}_latest`, and its `term` field has the `taxonomy`.
 */
function LatestPostsInTermArgItems({
  argFields,
  args,
  channel,
  clientId,
  setArgs,
}: ChannelPanelFillProps) {
  return (
    <>
      {argFields.map(({
        id,
        label,
        required,
        taxonomy,
      }) => {
        if (
          id !== 'term'
          || typeof taxonomy !== 'string'
          || !channel.endsWith(`_${taxonomy}_latest`)
        ) {
          return null;
        }

        let help = '';

        if (required && !(id in args)) {
          help = __('The channel shows no posts until a term is selected.', 'wp-curate');
        }

        return (
          <ToolsPanelItem
            hasValue={() => id in args}
            isShownByDefault={required}
            key={id}
            label={label}
            onDeselect={() => setArgs(withoutArg(args, id))}
            panelId={clientId}
            resetAllFilter={(next: Record<string, unknown>) => withoutArg(next, id)}
          >
            <TermControl
              help={help}
              label={label}
              multiple={false}
              onChange={(ids) => {
                const [term] = ids;

                setArgs(term === undefined ? withoutArg(args, id) : { ...args, [id]: term });
              }}
              taxonomy={taxonomy}
              value={args[id]}
            />
          </ToolsPanelItem>
        );
      })}
    </>
  );
}

/**
 * Adds the term picker of the "Latest Posts in Term" channels to the Channel panel through its
 * slot, the way that other plugins can add controls for their own channels.
 */
export default function LatestPostsInTermArgs() {
  return (
    <ChannelPanelFill>
      {(fillProps) => <LatestPostsInTermArgItems {...(fillProps as ChannelPanelFillProps)} />}
    </ChannelPanelFill>
  );
}
