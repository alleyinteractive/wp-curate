// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { ComboboxControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// Plugin dependencies.
import type { AvailableChannel } from '../../entries/block-editor/channelStore';
import { channelsContext } from '../../hooks/useBlockChannel';

/**
 * A dropdown of the channels that a block with the given context can select.
 */
export default function ChannelSelectControl({
  context,
  help,
  onChange,
  value,
}: {
  context: Record<string, unknown>;
  help: string;
  onChange: (channel: string) => void;
  value: string;
}) {
  // Compare the context by value, since callers can pass a new object on each render.
  const contextKey = JSON.stringify(context);

  const channels: AvailableChannel[] | null = useSelect((select) => {
    const {
      getAvailableChannels,
    } = select('wp-curate/channels') as any;

    let out: AvailableChannel[] | null = null;

    const used = channelsContext(select, JSON.parse(contextKey));

    if (used !== null) {
      out = getAvailableChannels(used);
    }

    return out;
  }, [contextKey]);

  // The channels to choose from, or null while they load.
  const eligible = useMemo(() => {
    let out: AvailableChannel[] | null = null;

    if (channels !== null) {
      out = channels.filter(({ eligible: isEligible }) => isEligible);
    }

    return out;
  }, [channels]);

  const options = useMemo(() => {
    const out: { disabled?: boolean, label: string, value: string }[] = [];

    if (eligible === null) {
      return out;
    }

    eligible.forEach(({ label, name }) => {
      out.push({ label, value: name });
    });

    /*
     * Show the label of a saved channel that is not eligible, such as one that a block kept when
     * it moved. The option is disabled, so that it cannot be chosen again once the block leaves it.
     */
    if (value !== '' && !eligible.some(({ name }) => name === value)) {
      let label = value;
      let saved: AvailableChannel | undefined;

      if (channels !== null) {
        saved = channels.find(({ name }) => name === value);
      }

      if (saved !== undefined) {
        ({ label } = saved);
      }

      out.push({ disabled: true, label, value });
    }

    return out;
  }, [eligible, channels, value]);

  // With no channels registered, there is nothing to choose. That case will be handled later.
  let placeholder: string | undefined;

  if (eligible !== null && eligible.length === 0) {
    placeholder = __('No channels are available', 'wp-curate');
  }

  return (
    <ComboboxControl
      __next40pxDefaultSize
      __nextHasNoMarginBottom
      // A block always has a channel, so there is nothing to reset to.
      allowReset={false}
      help={help}
      isLoading={eligible === null}
      label={__('Channel', 'wp-curate')}
      onChange={(next) => {
        // The control gives null only from its reset button, which is off.
        if (typeof next === 'string' && next !== '') {
          onChange(next);
        }
      }}
      options={options}
      placeholder={placeholder}
      value={value}
    />
  );
}
