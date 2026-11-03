import apiFetch from '@wordpress/api-fetch';
import isShallowEqual from '@wordpress/is-shallow-equal';
import { addQueryArgs } from '@wordpress/url';

import { mainDedupe } from '../deduplicate';

interface UpdateValidPostsArgs {
  manualPosts: (number | null)[];
  postTypeString: string;
  includeFuturePosts?: boolean;
  validPosts: number[];
  setAttributes: (attributes: { validPosts: number[] }) => void;
  isSuperseded: () => boolean;
}

/**
 * Store which pinned posts still exist and are published, and deduplicate when they change.
 */
export default async function updateValidPosts({
  manualPosts,
  postTypeString,
  includeFuturePosts,
  validPosts,
  setAttributes,
  isSuperseded,
}: UpdateValidPostsArgs) {
  const postsToInclude = manualPosts.filter((id) => id !== null).join(',');
  let newValidPosts: number[] = [];

  if (postsToInclude.length > 0) {
    const result = await apiFetch<unknown>({
      path: addQueryArgs(
        '/wp/v2/posts',
        {
          offset: 0,
          orderby: 'include',
          per_page: postsToInclude.length,
          type: postTypeString,
          include: postsToInclude,
          status: includeFuturePosts ? ['publish', 'future'] : 'publish',
          _locale: 'user',
          context: 'edit',
        },
      ),
    });

    newValidPosts = Array.isArray(result)
      ? result
        .map((post: unknown) => {
          if (
            post
            && typeof post === 'object'
            && 'id' in post
            && typeof post.id === 'number'
          ) {
            return post.id;
          }

          return 0;
        })
        .filter((id) => id !== 0)
      : [];
  }

  // A newer run started while this request was in flight. Writing it would drop the current pin.
  if (isSuperseded()) {
    return;
  }

  /*
   * An equal write still edits the post, which remounts every other template preview.
   * The block editor compares attributes by identity, so an equal array counts as a change.
   */
  if (isShallowEqual(validPosts, newValidPosts)) {
    return;
  }

  setAttributes({ validPosts: newValidPosts });

  /*
   * `mainDedupe` drops any pin missing from `validPosts`, so the pass
   * triggered by the pin itself runs against stale data and fills
   * the slot from backfill instead. This is the pass that applies the pin.
   */
  mainDedupe();
}
