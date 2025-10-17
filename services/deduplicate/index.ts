import { select, dispatch } from '@wordpress/data';
import type { Block } from '../../types/block';
import recursivelyFindBlocksByName from '../recursivelyFindBlocksByName';

const usedIds = new Map();
const curatedIds = new Map();

let running = false;
let redo = false;

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

// Recursively find all query blocks.
const getQueryBlocks = (blocks: Block[], blockNames: string[], out: Block[]) => {
  blocks.forEach((block: Block) => {
    if (blockNames.includes(block.name)) {
      out.push(block);
    }
    const { innerBlocks } = block;
    if (!innerBlocks) {
      return;
    }
    getQueryBlocks(innerBlocks, blockNames, out);
  });
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

  running = true;
  // Clear the flag for another run.
  redo = false;
  resetUsedIds();
  // @ts-ignore
  const blocks: Block[] = select('core/block-editor').getBlocks();
  const {
    wp_curate_deduplication: wpCurateDeduplication = true,
    wp_curate_unique_pinned_posts: wpCurateUniquePinnedPosts = false,
    // @ts-ignore
  } = select('core/editor').getEditedPostAttribute('meta') || {};

  const queryBlocks: Block[] = [];
  getQueryBlocks(blocks, ['wp-curate/query', 'wp-curate/subquery'], queryBlocks);

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
    console.log('curateableBlocks', curateableBlocks);
    const postBlockCount = curateableBlocks.filter((block) => block.name === 'wp-curate/post').length;
    curateableBlocks.forEach((curateableBlock) => {
      if (curateableBlock.name === 'wp-curate/post') {
        // Update each post block with the correct post id.
        // @ts-ignore
        dispatch('core/block-editor')
          .updateBlockAttributes(
            curateableBlock.clientId,
            {
              postId: allPostIds.shift() || 0,
            },
          );
      } else if (curateableBlock.name === 'core/post-template') {
        // Update the query block with the new query.
        const templateIds = allPostIds.splice(0, numberOfPosts - postBlockCount);
        // @ts-ignore
        dispatch('core/block-editor')
          .updateBlockAttributes(
            queryBlock.clientId,
            {
              // Set the query attribute to pass to the child blocks.
              query: {
                perPage: templateIds.length,
                postType: 'post',
                type: postTypeString,
                include: templateIds.join(','),
                orderby: 'include',
              },
              queryId: 0,
            },
          );
      }
    });
  });

  running = false;

  if (redo) {
    // Another run has been requested. Let's run it.
    mainDedupe();
  }
}
