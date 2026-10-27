// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { __ } from '@wordpress/i18n';
import { usePostMetaValue } from '@alleyinteractive/block-editor-tools';

// Plugin dependencies.
import ChannelSelectControl from '../../../components/ChannelSelectControl';
import { DEFAULT_CHANNEL_META_KEY } from '../../../hooks/useBlockChannel';

/**
 * The document sidebar panel for the post's default channel.
 */
export default function DefaultChannel() {
  const [defaultChannel, setDefaultChannel] = usePostMetaValue(DEFAULT_CHANNEL_META_KEY);

  // The meta is registered only for supported post types.
  if (typeof defaultChannel !== 'string') {
    return null;
  }

  return (
    <PluginDocumentSettingPanel
      name="wp-curate-default-channel"
      title={__('WP Curate: Default Channel', 'wp-curate')}
    >
      <ChannelSelectControl
        help={__('Blocks without a channel selected use this channel.', 'wp-curate')}
        onChange={setDefaultChannel}
        value={defaultChannel}
        withBlockChannels={false}
      />
    </PluginDocumentSettingPanel>
  );
}
