import classnames from 'classnames';
import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';
import { PostPicker } from '@alleyinteractive/block-editor-tools';
import { dispatch, select, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

import NoRender from './norender';

import './index.scss';

interface PostEditProps {
  clientId: string;
  context: {
    postId: number;
    query: {
      include?: string;
    };
  };
  isSelected: boolean;
}

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
      include = '',
    } = {},
  },
  isSelected,
}: PostEditProps) {
  // @ts-ignore
  const queryParentId = select('core/block-editor').getBlockParentsByBlockName(clientId, 'wp-curate/query')[0];
  // @ts-ignore
  const queryParent = select('core/block-editor').getBlock(queryParentId) ?? {
    attributes: {
      posts: [],
      postTypes: [],
    },
  };
  const {
    attributes: {
      posts = [],
      postTypes = [],
    } = {},
  } = queryParent;
  const queryInclude = include.split(',').map((id: string) => parseInt(id, 10));
  const index = queryInclude.findIndex((id: number) => id === postId);
  const selected = posts[index];

  const updatePost = (post: number | null) => {
    const newPosts = [...posts];
    newPosts[index] = post;
    // @ts-ignore
    dispatch('core/block-editor').updateBlockAttributes(queryParentId, {
      posts: newPosts,
    });
  };

  const resetPost = () => {
    updatePost(null);
  };

  // Whether this block has any selected children.
  const isParentOfSelectedBlock = useSelect((innerSelect) => (
    // @ts-ignore
    innerSelect('core/block-editor').hasSelectedInnerBlock(clientId, true)
  ), [clientId]);

  return (
    <div {...useBlockProps(
      {
        className: classnames(
          'wp-curate-post-block',
          { 'wp-curate-post-block--selected': isParentOfSelectedBlock },
          { 'wp-curate-post-block--backfill': !selected },
        ),
      },
    )}
    >
      {isParentOfSelectedBlock || isSelected ? (
        <PostPicker
          allowedTypes={postTypes}
          onUpdate={updatePost}
          onReset={resetPost}
          value={selected ?? 0}
          previewRender={(NoRender)}
          className="wp-curate-post-block__post-picker"
          selectText={__('Pin a post', 'wp-curate')}
          resetText={__('Backfill post', 'wp-curate')}
          replaceText={__('Pin a different post', 'wp-curate')}
        />
      ) : null}
      <InnerBlocks />
    </div>
  );
}
