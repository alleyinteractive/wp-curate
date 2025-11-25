import { useState } from 'react';
import classnames from 'classnames';
import type { WP_REST_API_Post as WpRestApiPost } from 'wp-types'; // eslint-disable-line camelcase

// @ts-expect-error BlockContextProvider not available in types yet.
import { InnerBlocks, useBlockProps, BlockContextProvider } from '@wordpress/block-editor';
import { PostPicker, usePostById } from '@alleyinteractive/block-editor-tools';
import { dispatch, select, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { Button, Notice } from '@wordpress/components';
import { useCallback } from '@wordpress/element';

import type { Block } from '../../types/block';
import NoRender from './norender';
import SearchFilters from '../../components/SearchFilters';
import recursivelyFindBlocksByName from '../../services/recursivelyFindBlocksByName';
import { postTypeWithFuture } from '../../services/utils';

import type {
  Term,
  Option,
} from '../query/types';

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
  attributes: {
    postId?: number;
  };
}

interface PostTypeOrTerm {
  name: string;
  slug: string;
  rest_base?: string;
}

interface Window {
  wpCurateQueryBlock: {
    allowedPostTypes: PostTypeOrTerm[];
    includeFuturePosts: boolean;
  };
}

/**
 * The wp-curate/post block edit function.
 *
 * @return {WPElement} Element to render.
 */
export default function Edit({
  clientId,
  context: {
    postId: contextPostId,
    query: {
      include = '',
    } = {},
    moveData = {},
  },
  isSelected,
  attributes: {
    postId: attributePostId,
  },
}: PostEditProps) {
  const postId = attributePostId || contextPostId;
  const {
    wpCurateQueryBlock: {
      allowedPostTypes = [],
      includeFuturePosts,
    } = {},
  } = (window as any as Window);

  // @ts-ignore
  const queryParents = select('core/block-editor').getBlockParentsByBlockName(clientId, ['wp-curate/query', 'wp-curate/subquery']);
  const queryParentId = queryParents[queryParents.length - 1];

  const templateBlockParents = select('core/block-editor').getBlockParentsByBlockName(clientId, 'core/post-template');
  const hasPostTemplateBlock = templateBlockParents.length > 0;

  // @ts-ignore
  const queryParent = select('core/block-editor').getBlock(queryParentId) ?? {
    attributes: {
      posts: [],
      postTypes: [],
      terms: {} as Record<string, Term[]>,
      supportsPostTypes: [],
    },
  };

  const queryBlocks = select('core/block-editor').getBlocksByName('wp-curate/query', 'wp-curate/subquery');
  const {
    attributes: {
      posts = [],
      postTypes = [],
      terms = {} as Record<string, Term[]>,
      supportsPostTypes = [],
      numberOfPosts = 0,
    } = {},
    name: parentName,
  } = queryParent;

  const curateableBlocks: Block[] = [];
  recursivelyFindBlocksByName(queryParent, ['wp-curate/post', 'core/post-template'], curateableBlocks);
  const postBlockCount = curateableBlocks.filter((block) => block.name === 'wp-curate/post').length;
  let templateBlockIndex = 0;
  let templateBlockPostCount = 0;
  if (hasPostTemplateBlock) {
    const templateBlockId = templateBlockParents[templateBlockParents.length - 1];
    templateBlockIndex = curateableBlocks.findIndex((block) => block.clientId === templateBlockId);
  } else {
    const thisBlockIndex = curateableBlocks.findIndex((block) => block.clientId === clientId);
    templateBlockIndex = curateableBlocks.findIndex((block) => block.name === 'core/post-template');
    // If there's a template block before this one, offset the index by the number of posts
    // that would be rendered inside the template block.
    if (templateBlockIndex !== -1 && templateBlockIndex < thisBlockIndex) {
      // Number of posts, minus the total number of post blocks,
      // removing the post block in the template block.
      templateBlockPostCount = numberOfPosts - postBlockCount;
    }
  }

  const [filtered, setFiltered] = useState(true);

  let selected = null;
  let index = null;
  if (hasPostTemplateBlock) {
    const queryInclude = include.split(',').map((id: string) => parseInt(id, 10));
    index = queryInclude.findIndex((id: number) => id === postId) + templateBlockIndex;
    selected = posts[index] ?? null;
  } else {
    const postBlocks: Block[] = [];
    recursivelyFindBlocksByName(queryParent, 'wp-curate/post', postBlocks);
    // the index of the post block within the query block
    index = postBlocks.findIndex((block) => block.clientId === clientId);
    if (templateBlockIndex < index && templateBlockIndex !== -1) {
      index -= 1; // minus 1 if for the Post block inside the template block.
    }
    index += templateBlockPostCount;
    selected = posts[index] ?? null;
  }
  const postDeleted = selected !== null && selected !== postId;

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
      // If this one is hidden, select the previous one.
      if (targetElement.style.display === 'none' && targetElement.previousElementSibling) {
        targetElement = targetElement.previousElementSibling as HTMLElement;
      }
      // We want the wp-curate-post-block element not the wp-block-post element.
      if (targetElement.classList.contains('wp-block-post')) {
        targetElement = targetElement.querySelectorAll('.wp-curate-post-block')[0] as HTMLElement;
      }
      if (!targetElement.classList.contains('wp-curate-post-block')
        && !targetElement.classList.contains('components-button')
      ) {
        window.removeEventListener('click', clickHandler);
        cancelMove();
      } else if (targetElement.classList.contains('wp-block-wp-curate-post')) {
        e.preventDefault();
        // Get the parent wp-query block.
        const parent = targetElement.closest('[data-type="wp-curate/query"], [data-type="wp-curate/subquery"]') as HTMLElement;
        if (!parent) {
          return;
        }
        // find all visible wp-curate-post-block children of the parent that are not inside a .wp-block-wp-curate-subquery block
        const parentChildren = parent.querySelectorAll('.wp-curate-post-block');
        const visibleChildren = [...parentChildren].filter((el) => {
          if (el.closest('.wp-block-wp-curate-subquery')) {
            return false;
          }
          return el.parentElement?.style?.display !== 'none';
        });

        const targetIndex = Array.prototype.indexOf.call(visibleChildren, targetElement);
        const parentId = parent.dataset.block;
        if (!parentId) {
          return;
        }

        const oldPosts = select('core/block-editor').getBlockAttributes(parentId)?.posts ?? [];
        const newPosts = oldPosts.map((post: number) => (post === newData.postId ? null : post));
        newPosts[targetIndex] = newData.postId;
        // @ts-ignore
        dispatch('core/block-editor').updateBlockAttributes(parentId, {
          posts: newPosts,
        });
        // Remove the post from the source query block if it's not the same as the target block.
        const sourceParent = select('core/block-editor').getBlockParentsByBlockName(newData.clientId, ['wp-curate/query', 'wp-curate/subquery']).pop();
        console.log('sourceParent', sourceParent);
        if (parentId !== sourceParent) {
          const sourceOldPosts = select('core/block-editor').getBlockAttributes(sourceParent)?.posts;
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

  // Get an object of taxonomies and termIds for filtering the
  // PostPicker as <Record<string, number[]>.
  const params: Record<string, number[]> = {};
  if (filtered) {
    Object.entries(terms).forEach(([taxonomy, termList]) => {
      if (Array.isArray(termList) && termList.length) {
        params[taxonomy] = termList.map((term) => term.id);
      }
    });
  }

  const displayTypes: Option[] = allowedPostTypes
    .map((type) => ({
      label: type.name,
      value: type.slug,
    }))
    .filter((type) => {
      // Inherits globally supported post types if attribute is empty.
      if (!supportsPostTypes.length) {
        return true;
      }

      // Display only supported post types defined by block.
      return supportsPostTypes.includes(type.value);
    });

  const shouldShowFilter = displayTypes.length !== postTypes.length
    || Object.values(terms).some((termList) => Array.isArray(termList) && termList.length > 0);

  const postObj = usePostById(
    postId,
    // @ts-ignore This function does work with this argument.
    includeFuturePosts ? postTypeWithFuture : null,
  ) as WpRestApiPost | null;

  return (
    <div
      {...useBlockProps(
        {
          className: classnames(
            'wp-curate-post-block',
            { 'wp-curate-post-block--selected': isParentOfSelectedBlock },
            { 'wp-curate-post-block--backfill': !selected || postDeleted },
            { 'curate-droppable': parentName === 'wp-curate/query' && moveData.postId && moveData.postId !== postId },
            { 'wp-curate-error': postDeleted },
          ),
        },
      )}
    >
      {typeof postObj === 'object' && postObj !== null && 'status' in postObj && postObj.status === 'future' ? (
        <Notice
          status="warning"
          isDismissible={false}
        >
          {__('Scheduled', 'wp-curate')}
        </Notice>
      ) : null}

      <BlockContextProvider value={{ postId }}>
        <InnerBlocks />
      </BlockContextProvider>
      {isParentOfSelectedBlock || isSelected ? (
        <div className="wp-curate-post-block__actions">
          {selected && !postDeleted ? (
            <Button
              variant="secondary"
              onClick={toggleMove}
            >
              {moveData.postId ? __('Cancel', 'wp-curate') : __('Move Post', 'wp-curate')}
            </Button>
          ) : <span />}
          <PostPicker
            allowedTypes={filtered ? postTypes : displayTypes.map((type) => type.value)}
            onUpdate={updatePost}
            onReset={resetPost}
            value={selected ?? 0}
            // @ts-ignore This function does work with this prop.
            getPostType={includeFuturePosts ? postTypeWithFuture : null}
            previewRender={(NoRender)}
            className="wp-curate-post-block__post-picker"
            selectText={__('Pin a Post', 'wp-curate')}
            resetText={__('Backfill Post', 'wp-curate')}
            replaceText={__('Pin a Different Post', 'wp-curate')}
            filters={(
              <SearchFilters
                shouldShowFilter={shouldShowFilter}
                filtered={filtered}
                setFiltered={setFiltered}
              />
            )}
            params={{
              ...params,
              wp_curate_include_future: includeFuturePosts,
            }}
          />
          {
            // If this post isn't already in the posts list, show a button to pin it.
            !posts.includes(postId) && !postDeleted
              ? (
                <Button
                  className="wp-curate-post-block__pin-post"
                  variant="secondary"
                  onClick={() => {
                    updatePost(postId);
                  }}
                >
                  {__('Pin This Post', 'wp-curate')}
                </Button>
              )
              : null
          }
        </div>
      ) : null}
    </div>
  );
}
