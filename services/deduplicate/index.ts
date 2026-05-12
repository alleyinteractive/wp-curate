import { select, dispatch, subscribe } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import type { Block } from '../../types/block';
import recursivelyFindBlocksByName from '../recursivelyFindBlocksByName';

interface Window {
  wpCurateQueryBlock: {
    includeFuturePosts: boolean;
  };
}

const usedIds = new Map();
const curatedIds = new Map();

let running = false;
let redo = false;
// Prevents stacking multiple subscriptions when synced patterns are pending.
let patternSubscribeActive = false;

/**
 * Checks if a post has been used already on this page. If so, return false. If not
 * add it to the list and return true.
 *
 * @param {number|string} id The post id to check.
 * @returns boolean
 */
export function deduplicate(id: number | string): boolean {
  if (!id) {
    return true;
  }
  const idNumber = typeof id === 'string' ? parseInt(id, 10) : id;
  if (usedIds.has(idNumber)) {
    return false;
  }
  usedIds.set(idNumber, true);
  return true;
}

export function markUsed(id: number | string) {
  if (!id) {
    return;
  }
  const idNumber = typeof id === 'string' ? parseInt(id, 10) : id;
  usedIds.set(idNumber, true);
}

/**
 * Resets the list of used ids.
 */
export function resetUsedIds() {
  usedIds.clear();
  curatedIds.clear();
}

export default {
  deduplicate,
  resetUsedIds,
};

/**
 * Recursively collects all blocks matching `blockNames` into `out`.
 *
 * For reusable blocks (`core/block`), inner blocks are resolved from the block
 * editor store rather than read from `innerBlocks`, since reusable block
 * content is not nested directly on the block object. Returns the clientIds of
 * any synced patterns whose inner blocks are not yet loaded in the store, so
 * mainDedupe can re-run once they become available.
 */
const getQueryBlocks = (blocks: Block[], blockNames: string[], out: Block[]): string[] => {
  const unresolvedIds: string[] = [];
  blocks.forEach((block: Block) => {
    if (blockNames.includes(block.name)) {
      out.push(block);
    }
    // For reusable blocks, resolve their inner blocks from the store.
    if (block.name === 'core/block') {
      // @ts-expect-error Methods not fully typed.
      const reusableInnerBlocks: Block[] = select(blockEditorStore).getBlocks(block.clientId);
      if (reusableInnerBlocks?.length) {
        unresolvedIds.push(...getQueryBlocks(reusableInnerBlocks, blockNames, out));
      } else {
        // Inner blocks not yet loaded; will re-run mainDedupe once they are.
        unresolvedIds.push(block.clientId);
      }
      return;
    }
    const { innerBlocks } = block;
    if (!innerBlocks) {
      return;
    }
    unresolvedIds.push(...getQueryBlocks(innerBlocks, blockNames, out));
  });
  return unresolvedIds;
};

/**
 * This is the main function to update all pinned posts. Call it whenever a pinned post
 * changes or the query settings change.
 */
export function mainDedupe() {
  if (running) {
    // Only one run at a time, but mark that another run has been requested.
    redo = true;
    return;
  }

  // If the block transforms menu is currently open, skip deduplication.
  if (document.querySelector('.block-editor-block-switcher__popover__preview__parent')) {
    return;
  }
  // Same, but for WordPress 6.7 and later.
  if (document.querySelector('.block-editor-block-switcher__popover-preview')) {
    return;
  }

  const {
    wpCurateQueryBlock: {
      includeFuturePosts,
    } = {},
  } = (window as any as Window);

  running = true;
  // Clear the flag for another run.
  redo = false;
  resetUsedIds();

  // @ts-expect-error Methods not fully typed.
  const { getBlocksByName, getBlocks } = select(blockEditorStore);

  /**
   * There isn't support yet for deduplicating posts throughout an entire template.
   * If we're in template mode, narrow the scope to just the blocks in post content.
   */
  const root: Block[] = getBlocksByName('core/post-content');
  const blocks: Block[] = root.length === 1 ? getBlocks(root) : getBlocks();

  const {
    wp_curate_deduplication: wpCurateDeduplication = true,
    wp_curate_unique_pinned_posts: wpCurateUniquePinnedPosts = false,
    // @ts-ignore
  } = select('core/editor').getEditedPostAttribute('meta') || {};

  const queryBlocks: Block[] = [];
  const unresolvedPatternIds = getQueryBlocks(blocks, ['wp-curate/query', 'wp-curate/subquery'], queryBlocks);

  /**
   * This block of code is responsible for enforcing the unique pinned posts setting in the editor.
   */
  if (wpCurateUniquePinnedPosts) {
    queryBlocks.forEach((queryBlock) => {
      queryBlock?.attributes?.posts?.forEach((post) => {
        if (post) {
          deduplicate(post);
        }
      });
    });
  }

  // Loop through all query blocks and set backfilled posts in the open slots.
  queryBlocks.forEach((queryBlock) => {
    const { attributes } = queryBlock;
    const {
      backfillPosts = null,
      deduplication = 'inherit',
      posts = [],
      numberOfPosts = 5,
      postTypes = ['post'],
      validPosts = [],
    } = attributes;
    if (!backfillPosts) {
      return;
    }
    const postTypeString = postTypes.join(',');
    let postIndex = 0;

    // New array to hold our final list of posts.
    const allPostIds: Array<number | undefined> = [];

    // New array to hold the pinned posts in the order they should be.
    const manualPostIdArray: Array<number | null> = posts.map(
      (post) => validPosts.includes(post) ? post : null, // eslint-disable-line no-confusing-arrow
    );

    // Remove any pinned posts from the backfilled posts list.
    const filteredPosts = backfillPosts.filter((post) => !manualPostIdArray.includes(post));

    // Fill out the array with nulls where there isn't a pinned post.
    for (let i = 0; i < numberOfPosts; i += 1) {
      if (!manualPostIdArray[i]) {
        manualPostIdArray[i] = null;
      }
    }

    // Loop through the pinned posts/null and generate the final list.
    manualPostIdArray.forEach((_post, index) => {
      let manualPost;
      let backfillPost;
      let isUnique = false;

      // If there is a pinned post, use it. Otherwise, use the next unused backfilled post.
      if (manualPostIdArray[index] !== null) {
        manualPost = manualPostIdArray[index];
        // @ts-ignore
        markUsed(manualPost);
      } else {
        do {
          if (filteredPosts[postIndex]) {
            backfillPost = filteredPosts[postIndex];
            if (wpCurateDeduplication && deduplication === 'inherit') {
              isUnique = deduplicate(backfillPost);
            } else {
              isUnique = true;
              markUsed(backfillPost);
            }
          }
          postIndex += 1;
        } while (isUnique === false && postIndex <= filteredPosts.length);
      }
      allPostIds.push(manualPost || backfillPost);
    });

    const curateableBlocks: Block[] = [];
    recursivelyFindBlocksByName(queryBlock, ['wp-curate/post', 'core/post-template'], curateableBlocks);
    const postBlockCount = curateableBlocks.filter((block) => block.name === 'wp-curate/post').length;

    // Track all resolved post IDs to set as allPostIds context on the query block.
    const resolvedPostIds: Array<number | undefined> = [];

    curateableBlocks.forEach((curateableBlock) => {
      if (curateableBlock.name === 'wp-curate/post') {
        const postId = allPostIds.shift() || 0;
        resolvedPostIds.push(postId);
        // Update each post block with the correct post id.
        // @ts-ignore
        dispatch(blockEditorStore).updateBlockAttributes(
          curateableBlock.clientId,
          {
            postId,
          },
        );
      } else if (curateableBlock.name === 'core/post-template') {
        // Update the query block with the new query.
        const templateIds = allPostIds.splice(0, numberOfPosts - postBlockCount);
        resolvedPostIds.push(...templateIds);
        // @ts-ignore
        dispatch(blockEditorStore).updateBlockAttributes(
          queryBlock.clientId,
          {
            // Set the query attribute to pass to the child blocks.
            query: {
              perPage: templateIds.length,
              postType: postTypeString,
              type: postTypeString,
              include: templateIds.join(','),
              orderby: 'include',
              wp_curate_include_future: includeFuturePosts,
            },
            queryId: 0,
          },
        );
      }
    });

    // Set allPostIds on the query block so descendants (e.g., wp-curate/subquery)
    // can determine post position via context without relying on query.include.
    // @ts-ignore
    dispatch(blockEditorStore).updateBlockAttributes(
      queryBlock.clientId,
      {
        allPostIds: resolvedPostIds.filter(Boolean), // Filter out falsy values (0, undefined).
      },
    );
  });

  running = false;

  if (redo) {
    // Another run has been requested. Let's run it.
    mainDedupe();
  } else if (unresolvedPatternIds.length > 0 && !patternSubscribeActive) {
    // One or more synced patterns had inner blocks that weren't loaded yet when
    // getQueryBlocks ran. Subscribe to the block editor store and re-run once
    // all of them are resolved so deduplication reflects their pinned posts.
    patternSubscribeActive = true;
    const unsubscribe = subscribe(() => {
      const allResolved = unresolvedPatternIds.every(
        // @ts-expect-error Methods not fully typed.
        (id) => (select(blockEditorStore).getBlocks(id) ?? []).length > 0,
      );
      if (allResolved) {
        patternSubscribeActive = false;
        unsubscribe();
        mainDedupe();
      }
    }, blockEditorStore);
  }
}
