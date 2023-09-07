import { select, dispatch } from '@wordpress/data';

const usedIds = new Map();
const curatedIds = new Map();

let running = false;
let redo = false;

interface Block {
  attributes: {
    backfillPosts?: number[];
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
  const queryBlocks: Block[] = [];
  blocks.forEach((block: Block) => {
    if (block.name === 'wp-curate/query') {
      queryBlocks.push(block);
    } else {
      const { innerBlocks } = block;
      if (!innerBlocks) {
        return;
      }
      innerBlocks.forEach((innerBlock) => {
        if (innerBlock.name === 'wp-curate/query') {
          queryBlocks.push(innerBlock);
        }
      });
    }
  });
  queryBlocks.forEach((queryBlock) => {
    const { attributes } = queryBlock;
    const { posts } = attributes;
    posts?.forEach((post) => {
      if (post) {
        deduplicate(post);
      }
    });
  });
  queryBlocks.forEach((queryBlock) => {
    const { attributes } = queryBlock;
    const {
      backfillPosts = [],
      posts = [],
      numberOfPosts = 5,
      postTypes = ['post'],
    } = attributes;
    if (!backfillPosts.length) {
      return;
    }
    const postTypeString = postTypes.join(',');
    let postIndex = 0;
    const allPosts: Array<number | undefined> = [];
    const manualPostIdArray: Array<number | null> = posts;

    const filteredPosts = backfillPosts.filter((post) => !manualPostIdArray.includes(post));
    for (let i = 0; i < numberOfPosts; i += 1) {
      if (!manualPostIdArray[i]) {
        manualPostIdArray[i] = null;
      }
    }

    manualPostIdArray.forEach((post, index) => {
      let manualPost;
      let backfillPost;
      let isUnique = false;
      if (manualPostIdArray[index]) {
        manualPost = manualPostIdArray[index];
      } else {
        do {
          if (filteredPosts[postIndex]) {
            backfillPost = filteredPosts[postIndex];
            // TODO: check post and block settings for deduplication.
            isUnique = deduplicate(backfillPost);
          }
          postIndex += 1;
        } while (isUnique === false && postIndex <= filteredPosts.length);
      }
      allPosts.push(manualPost ?? backfillPost);
    });
    const query = {
      perPage: numberOfPosts,
      postType: 'post',
      type: postTypeString,
      include: allPosts.join(','),
      orderby: 'include',
    };
    // @ts-ignore
    dispatch('core/block-editor').updateBlockAttributes(queryBlock.clientId, { query, queryId: 0 });
  });
  running = false;
  if (redo) {
    // Another run has been requested. Let's run it.
    mainDedupe();
  }
}
