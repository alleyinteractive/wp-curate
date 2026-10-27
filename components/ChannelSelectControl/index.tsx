// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { SelectControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// Plugin dependencies.
import type { ChannelOption } from '../../entries/block-editor/channelStore';

interface ChannelSelectControlProps {
  help: string;
  onChange: (channel: string) => void;
  value: string;
  withArgChannels: boolean;
}

/**
 * A dropdown of the channels.
 *
 * Only a block can give arguments to a channel, so a dropdown for anything else leaves out the
 * channels that read them.
 */
export default function ChannelSelectControl({
  help,
  onChange,
  value,
  withArgChannels,
}: ChannelSelectControlProps) {
  const channels: ChannelOption[] | null = useSelect((select) => {
    const {
      getChannels,
    } = select('wp-curate/channels') as any;

    return getChannels();
  }, []);

  // The channels to choose from, or null while they load.
  const available = useMemo(() => {
    let out: ChannelOption[] | null = null;

    if (channels !== null) {
      out = channels.filter(({ arg_fields: argFields }) => (
        withArgChannels || argFields.length === 0
      ));
    }

    return out;
  }, [channels, withArgChannels]);

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

    // Show a saved channel that is not available, so that the dropdown does not hide it.
    if (value !== '' && !available.some(({ name }) => name === value)) {
      out.push({ label: value, value });
    }

    return out;
  }, [available, value]);

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
