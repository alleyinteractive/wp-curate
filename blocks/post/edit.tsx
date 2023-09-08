import { __ } from '@wordpress/i18n';
import classnames from 'classnames';
import { BlockControls, InnerBlocks, useBlockProps } from '@wordpress/block-editor';
import { PostPicker } from '@alleyinteractive/block-editor-tools';
import { select, useSelect } from '@wordpress/data';

import './index.scss';

/**
 * The wp-curate/post block edit function.
 *
 * @return {WPElement} Element to render.
 */
export default function Edit({
  clientId,
  context: {
    postId,
    query: {
      include = [],
    } = {},
  },
}) {

  const queryParentId = select('core/block-editor').getBlockParentsByBlockName(clientId, 'wp-curate/query')[0];
  const queryParent = select('core/block-editor').getBlock(queryParentId) ?? {};
  const {
    attributes,
    attributes: {
      posts = [],
      postTypes = [],
    } = {},
  } = queryParent;
  console.log('attributes', attributes);
  const queryInclude = include.split(',').map((id: number | string) => parseInt(id, 10));
  const index = queryInclude.findIndex((id: number) => id === postId);
  const selected = posts[index];

  const updatePost = (post: number | null) => {
    const newPosts = [...posts];
    newPosts[index] = post;
    wp.data.dispatch('core/block-editor').updateBlockAttributes(queryParentId, {
      posts: newPosts,
    });
  };

  const resetPost = () => {
    updatePost(null);
  };

  // Whether this block has any selected children.
  const isParentOfSelectedBlock = useSelect((select) => (
    select('core/block-editor').hasSelectedInnerBlock(clientId, true)
  ), [clientId]);

  return (
    <div
      {...useBlockProps()}
      className={classnames(
        'wp-curate-post-block',
        { 'wp-curate-post-block--selected': isParentOfSelectedBlock },
        { 'wp-curate-post-block--backfill': !selected },
      )}
    >
      <PostPicker
        allowedTypes={postTypes}
        onUpdate={updatePost}
        onReset={resetPost}
        value={selected ?? 0}
        previewRender={() => null}
      />
      <InnerBlocks />
    </div>
  );
}
