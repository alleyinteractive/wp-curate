import { ToggleControl } from '@wordpress/components';
import { PluginDocumentSettingPanel } from '@wordpress/edit-post';
import { group } from '@wordpress/icons';
import { __ } from '@wordpress/i18n';
import { usePostMetaValue } from '@alleyinteractive/block-editor-tools';

function Deduplication() {
  const [deduplication, setDeduplication] = usePostMetaValue('wp_curate_deduplication');

  return (
    <PluginDocumentSettingPanel
      // @ts-ignore
      icon={group}
      name="deduplication"
      title={__('Deduplication', 'wp-curate')}
    >
      {/* @ts-ignore */}
      <ToggleControl
        label={__('Enable deduplication', 'wp-curate')}
        checked={deduplication}
        onChange={(value) => setDeduplication(value)}
      />
    </PluginDocumentSettingPanel>
  );
}

export default Deduplication;
