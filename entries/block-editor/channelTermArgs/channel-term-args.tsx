// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { __experimentalToolsPanelItem as ToolsPanelItem } from '@wordpress/components';

// Plugin dependencies.
import { ChannelPanelFill } from '../../../components/ChannelPanelSlotFill';
import type { ChannelPanelFillProps } from '../../../components/ChannelPanelSlotFill';

// Internal dependencies.
import TermControl from './term-control';

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
 * A panel item with a term picker for each `term` field of the channel. The field has a `taxonomy`.
 */
function TermArgItems({
  argFields,
  args,
  clientId,
  setArgs,
}: ChannelPanelFillProps) {
  return (
    <>
      {argFields.map(({
        id,
        label,
        taxonomy,
        type,
      }) => {
        if (type !== 'term' || typeof taxonomy !== 'string') {
          return null;
        }

        return (
          <ToolsPanelItem
            hasValue={() => id in args}
            // The channel needs the term, so the item always shows.
            isShownByDefault
            key={id}
            label={label}
            onDeselect={() => setArgs(withoutArg(args, id))}
            panelId={clientId}
            resetAllFilter={(next: Record<string, unknown>) => withoutArg(next, id)}
          >
            <TermControl
              label={label}
              onChange={(term) => setArgs({ ...args, [id]: term })}
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
 * Adds term pickers to the Channel panel through its slot, the way that other plugins can add their
 * own controls.
 */
export default function ChannelTermArgs() {
  return (
    <ChannelPanelFill>
      {(fillProps) => <TermArgItems {...(fillProps as ChannelPanelFillProps)} />}
    </ChannelPanelFill>
  );
}
