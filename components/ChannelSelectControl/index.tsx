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
}

/**
 * A dropdown of the channels.
 */
export default function ChannelSelectControl({
  help,
  onChange,
  value,
}: ChannelSelectControlProps) {
  const channels: ChannelOption[] | null = useSelect((select) => {
    const {
      getChannels,
    } = select('wp-curate/channels') as any;

    return getChannels();
  }, []);

  const options = useMemo(() => {
    const out: { label: string, value: string }[] = [];

    // With no channels registered, there is nothing to choose. That case will be handled later.
    if (channels !== null && channels.length === 0) {
      out.push({ label: __('No channels are available', 'wp-curate'), value: '' });
    }

    if (channels !== null) {
      channels.forEach(({ label, name }) => {
        out.push({ label, value: name });
      });
    }

    // Show a saved channel that no longer exists, so that the dropdown does not hide it.
    if (channels !== null && value !== '' && !channels.some(({ name }) => name === value)) {
      out.push({ label: value, value });
    }

    return out;
  }, [channels, value]);

  return (
    <SelectControl
      __next40pxDefaultSize
      __nextHasNoMarginBottom
      disabled={channels === null || channels.length === 0}
      help={help}
      label={__('Channel', 'wp-curate')}
      onChange={onChange}
      options={options}
      value={value}
    />
  );
}
