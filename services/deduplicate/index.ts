import { select, dispatch } from '@wordpress/data';

const usedIds = new Map();
const curatedIds = new Map();

let running = false;
let redo = false;

interface Block {
  attributes: {
    backfillPosts?: number[];
    deduplication?: string;
    numberOfPosts?: number;
    posts?: number[];
    postTypes?: string[];
    query?: {
      include?: number[];
    }
  },
  clientId: string;
  name: string;
  innerBlocks?: Block[];
}

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
const getQueryBlocks = (blocks: Block[], out: Block[]) => {
  blocks.forEach((block: Block) => {
    if (block.name === 'wp-curate/query') {
      out.push(block);
    } else {
      const { innerBlocks } = block;
      if (!innerBlocks) {
        return;
      }
      getQueryBlocks(innerBlocks, out);
    }
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
  // Loop through all blocks and find all query blocks.
  getQueryBlocks(blocks, queryBlocks);

  /**
   * This block of code is responsible for enforcing the unique pinned posts setting in the editor.
   */
  if (wpCurateUniquePinnedPosts) {
    queryBlocks.forEach((queryBlock) => {
      const { attributes } = queryBlock;
      const { posts } = attributes;
      posts?.forEach((post) => {
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
    } = attributes;
    if (!backfillPosts) {
      return;
    }
    const postTypeString = postTypes.join(',');
    let postIndex = 0;

    // New array to hold our final list of posts.
    const allPostIds: Array<number | undefined> = [];

    // New array to hold the pinned posts in the order they should be.
    const manualPostIdArray: Array<number | null> = posts;

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

    // Update the query block with the new query.
    // @ts-ignore
    dispatch('core/block-editor')
      .updateBlockAttributes(
        queryBlock.clientId,
        {
          // Set the query attribute to pass to the child blocks.
          query: {
            perPage: numberOfPosts,
            postType: 'post',
            type: postTypeString,
            include: allPostIds.join(','),
            orderby: 'include',
          },
          queryId: 0,
        },
      );
  });

  running = false;

  if (redo) {
    // Another run has been requested. Let's run it.
    mainDedupe();
  }
}
