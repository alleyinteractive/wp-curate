// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { SelectControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// Plugin dependencies.
import type { ChannelOption } from '../../entries/block-editor/channelStore';
import { canBeDefaultChannel, channelsContext } from '../../hooks/useBlockChannel';

interface ChannelSelectControlProps {
  context?: Record<string, unknown>;
  help: string;
  onChange: (channel: string) => void;
  value: string;
  withBlockChannels: boolean;
}

/**
 * A dropdown of the channels.
 *
 * A dropdown for a block lists the channels that a block with its context can select. A dropdown
 * for anything else lists only the channels that can be the default, because the others read
 * arguments or block context, which only a block has.
 */
export default function ChannelSelectControl({
  context = {},
  help,
  onChange,
  value,
  withBlockChannels,
}: ChannelSelectControlProps) {
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

    if (withBlockChannels && used !== null) {
      inContext = getChannelsInContext(used);
    }

    return {
      channels: getChannels() as ChannelOption[] | null,
      channelsInContext: inContext,
    };
  }, [contextKey, withBlockChannels]);

  // The channels to choose from, or null while they load.
  const available = useMemo(() => {
    let out: ChannelOption[] | null = null;

    if (!withBlockChannels && channels !== null) {
      out = channels.filter(canBeDefaultChannel);
    }

    if (withBlockChannels && channelsInContext !== null) {
      out = channelsInContext.filter(({ is_available: isAvailable }) => isAvailable);
    }

    return out;
  }, [channels, channelsInContext, withBlockChannels]);

  const options = useMemo(() => {
    const out: { label: string, value: string }[] = [];

    if (available === null) {
      return out;
    }

    // With no channels registered, there is nothing to choose. That case will be handled later.
    if (available.length === 0) {
      out.push({ label: __('No channels are available', 'wp-curate'), value: '' });
    }

    available.forEach(({ label, name }) => {
      out.push({ label, value: name });
    });

    /*
     * Show a saved channel that is not available, so that the dropdown does not hide it, such as
     * one that a block kept when it moved.
     */
    if (value !== '' && !available.some(({ name }) => name === value)) {
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
  }, [available, channels, value]);

  return (
    <SelectControl
      __next40pxDefaultSize
      __nextHasNoMarginBottom
      disabled={available === null || available.length === 0}
      help={help}
      label={__('Channel', 'wp-curate')}
      onChange={onChange}
      options={options}
      value={value}
    />
  );
}
