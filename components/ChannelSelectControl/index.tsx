// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { SelectControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// Plugin dependencies.
import type { ChannelOption } from '../../entries/block-editor/channelStore';
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

  const {
    channels,
    channelsInContext,
  } = useSelect((select) => {
    const {
      getChannels,
      getChannelsInContext,
    } = select('wp-curate/channels') as any;

    let inContext: ChannelOption[] | null = null;

    const used = channelsContext(select, JSON.parse(contextKey));

    if (used !== null) {
      inContext = getChannelsInContext(used);
    }

    return {
      channels: getChannels() as ChannelOption[] | null,
      channelsInContext: inContext,
    };
  }, [contextKey]);

  // The channels to choose from, or null while they load.
  const eligible = useMemo(() => {
    let out: ChannelOption[] | null = null;

    if (channelsInContext !== null) {
      out = channelsInContext.filter(({ eligible: isEligible }) => isEligible);
    }

    return out;
  }, [channelsInContext]);

  const options = useMemo(() => {
    const out: { label: string, value: string }[] = [];

    if (eligible === null) {
      return out;
    }

    // With no channels registered, there is nothing to choose. That case will be handled later.
    if (eligible.length === 0) {
      out.push({ label: __('No channels are available', 'wp-curate'), value: '' });
    }

    eligible.forEach(({ label, name }) => {
      out.push({ label, value: name });
    });

    /*
     * Show a saved channel that is not eligible, so that the dropdown does not hide it, such as
     * one that a block kept when it moved.
     */
    if (value !== '' && !eligible.some(({ name }) => name === value)) {
      let label = value;
      let saved: ChannelOption | undefined;

      if (channels !== null) {
        saved = channels.find(({ name }) => name === value);
      }

      if (saved !== undefined) {
        ({ label } = saved);
      }

      out.push({ label, value });
    }

    return out;
  }, [eligible, channels, value]);

  return (
    <SelectControl
      __next40pxDefaultSize
      __nextHasNoMarginBottom
      disabled={eligible === null || eligible.length === 0}
      help={help}
      label={__('Channel', 'wp-curate')}
      onChange={onChange}
      options={options}
      value={value}
    />
  );
}
