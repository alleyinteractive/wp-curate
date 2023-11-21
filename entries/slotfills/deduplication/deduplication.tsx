import { ToggleControl } from '@wordpress/components';
import { PluginDocumentSettingPanel } from '@wordpress/edit-post';
import { __ } from '@wordpress/i18n';
import { usePostMetaValue } from '@alleyinteractive/block-editor-tools';

/**
 * The following code is a temporary fix.
 *
 * Once the issue linked below is resolved, this code can be removed.
 * @link https://github.com/alleyinteractive/alley-scripts/issues/473
 */
// @ts-ignore This is a temporary assignment.
// eslint-disable-next-line import/no-extraneous-dependencies
import { cloneDeep } from 'lodash';
// @ts-ignore This is a temporary assignment.
window.cloneDeepTemp = cloneDeep;

function Deduplication() {
  const [deduplication, setDeduplication] = usePostMetaValue('wp_curate_deduplication');

  return (
    <PluginDocumentSettingPanel
      // @ts-ignore
      icon=""
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
