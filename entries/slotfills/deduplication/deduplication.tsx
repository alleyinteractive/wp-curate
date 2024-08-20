import { useEffect } from 'react';
import { ToggleControl } from '@wordpress/components';
import { PluginDocumentSettingPanel } from '@wordpress/edit-post';
import { __ } from '@wordpress/i18n';
import { usePostMetaValue } from '@alleyinteractive/block-editor-tools';
import { useSelect } from '@wordpress/data';

import countBlocksByName from '../../../services/countBlocksByName';

function Deduplication() {
  const [deduplication, setDeduplication] = usePostMetaValue('wp_curate_deduplication');
  const [uniquePinnedPosts, setUniquePinnedPosts] = usePostMetaValue('wp_curate_unique_pinned_posts');
  // @ts-ignore - useSelect doesn't export proper types
  const blocks = useSelect((select) => select('core/block-editor').getBlocks(), []);
  const queryBlocksFound = countBlocksByName(blocks, 'wp-curate/query');
  const twoOrMoreQueryBlocks = queryBlocksFound >= 2;

  /**
   * If deduplication is disabled, we should also disable unique pinned posts.
   */
  useEffect(() => {
    if (!twoOrMoreQueryBlocks) {
      return;
    }

    if (!deduplication && uniquePinnedPosts) {
      setUniquePinnedPosts(false);
    }
  }, [deduplication, setUniquePinnedPosts, twoOrMoreQueryBlocks, uniquePinnedPosts]);

  if (!twoOrMoreQueryBlocks) {
    return null;
  }

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
      <ToggleControl
        disabled={!deduplication}
        label={__('Enable unique pinned posts', 'wp-curate')}
        checked={uniquePinnedPosts}
        onChange={setUniquePinnedPosts}
      />
    </PluginDocumentSettingPanel>
  );
}

export default Deduplication;
