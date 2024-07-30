import classnames from 'classnames';
import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';
import { PostPicker } from '@alleyinteractive/block-editor-tools';
import { dispatch, select, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import { useCallback } from '@wordpress/element';

import NoRender from './norender';

import './index.scss';

interface PostEditProps {
  clientId: string;
  context: {
    postId: number;
    query: {
      include?: string;
    };
    moveData?: {
      postId?: number;
      clientId?: string;
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
    moveData = {},
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
  const queryBlocks = select('core/block-editor').getBlocksByName('wp-curate/query');
  const {
    attributes: {
      posts = [],
      postTypes = [],
    } = {},
  } = queryParent;

  const queryInclude = include.split(',').map((id: string) => parseInt(id, 10));
  const index = queryInclude.findIndex((id: number) => id === postId);
  const selected = posts[index];

  const updatePost = useCallback((post: number | null) => {
    const newPosts = [...posts];
    // If the post is already in the list, remove it.
    if (post !== null && newPosts.includes(post)) {
      newPosts.splice(newPosts.indexOf(post), 1, null);
    }
    newPosts[index] = post;
    // @ts-ignore
    dispatch('core/block-editor').updateBlockAttributes(queryParentId, {
      posts: newPosts,
    });
  }, [index, posts, queryParentId]);

  const resetPost = () => {
    updatePost(null);
  };

  // Whether this block has any selected children.
  const isParentOfSelectedBlock = useSelect((innerSelect) => (
    // @ts-ignore
    innerSelect('core/block-editor').hasSelectedInnerBlock(clientId, true)
  ), [clientId]);

  const toggleMove = () => {
    const newData = moveData.postId ? {} : { postId, clientId };

    queryBlocks.forEach((blockId: string) => {
      // @ts-ignore
      dispatch('core/block-editor').updateBlockAttributes(blockId, {
        moveData: newData,
      });
    });

    const cancelMove = () => {
      queryBlocks.forEach((blockId: string) => {
        // @ts-ignore
        dispatch('core/block-editor').updateBlockAttributes(blockId, {
          moveData: {},
        });
      });
    };

    const clickHandler = (e: MouseEvent) => {
      let targetElement = e.target as HTMLElement;
      // We want the wp-block-post element, not the wp-curate-post-block element.
      if (targetElement.classList.contains('wp-curate-post-block')) {
        targetElement = targetElement.parentElement as HTMLElement;
      }
      if (!targetElement.classList.contains('wp-block-post')
        && !targetElement.classList.contains('components-button')
      ) {
        window.removeEventListener('click', clickHandler);
        cancelMove();
      } else if (targetElement.classList.contains('wp-block-post')) {
        e.preventDefault();
        const parent = targetElement.parentNode as HTMLElement;
        if (!parent) {
          return;
        }
        let targetIndex = Array.prototype.indexOf.call(parent.children, targetElement);
        if (parent.classList.contains('is-selected')) {
          targetIndex -= 1;
        }
        const blockId = parent.dataset.block;
        const parentId = select('core/block-editor').getBlockParentsByBlockName(blockId, 'wp-curate/query')[0];

        const oldPosts = select('core/block-editor').getBlockAttributes(parentId).posts;
        const newPosts = oldPosts.map((post: number) => (post === newData.postId ? null : post));
        newPosts[targetIndex] = newData.postId;
        // @ts-ignore
        dispatch('core/block-editor').updateBlockAttributes(parentId, {
          posts: newPosts,
        });
        // Remove the post from the source query block if it's not the same as the target block.
        const sourceParent = select('core/block-editor').getBlockParentsByBlockName(newData.clientId, 'wp-curate/query')[0];
        if (parentId !== sourceParent) {
          const sourceOldPosts = select('core/block-editor').getBlockAttributes(sourceParent).posts;
          const sourceNewPosts = sourceOldPosts.map(
            (post: number) => (post === newData.postId ? null : post),
          );
          // @ts-ignore
          dispatch('core/block-editor').updateBlockAttributes(sourceParent, {
            posts: sourceNewPosts,
          });
        }
        cancelMove();
        window.removeEventListener('click', clickHandler);
        setTimeout(() => {
          // @ts-ignore - scrollIntoViewIfNeeded has ok browser support
          // and works better than scrollIntoView.
          document.querySelectorAll(`.post-${newData.postId}`)[0]?.scrollIntoViewIfNeeded({ behavior: 'smooth', block: 'start' });
        }, 500);
      }
    };

    if (newData.postId) {
      // @ts-ignore
      window.addEventListener('click', clickHandler);
    }
  };

  return (
    <div
      {...useBlockProps(
        {
          className: classnames(
            'wp-curate-post-block',
            { 'wp-curate-post-block--selected': isParentOfSelectedBlock },
            { 'wp-curate-post-block--backfill': !selected },
            { 'curate-droppable': moveData.postId && moveData.postId !== postId },
          ),
        },
      )}
    >
      <InnerBlocks />
      {isParentOfSelectedBlock || isSelected ? (
        <div className="wp-curate-post-block__actions">
          {selected ? (
            <Button
              variant="secondary"
              onClick={toggleMove}
            >
              {moveData.postId ? __('Cancel', 'wp-curate') : __('Move Post', 'wp-curate')}
            </Button>
          ) : <span />}
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
        </div>
      ) : null}
    </div>
  );
}
