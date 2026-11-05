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
 * Store which pinned posts are still valid, and deduplicate if that changed.
 */
export default async function updateValidPosts({
  manualPosts,
  postTypeString,
  includeFuturePosts,
  validPosts,
  setAttributes,
  isSuperseded,
}: UpdateValidPostsArgs) {
  const ids = manualPosts.filter((id) => id !== null);
  const postsToInclude = ids.join(',');
  let newValidPosts: number[] = [];

  if (postsToInclude.length > 0) {
    const result = await apiFetch<unknown>({
      path: addQueryArgs(
        '/wp/v2/posts',
        {
          offset: 0,
          orderby: 'include',
          per_page: ids.length,
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

  // A newer run started. This stale result would drop the current pin.
  if (isSuperseded()) {
    return;
  }

  // Attributes compare by identity, so an equal array still edits the post and remounts previews.
  if (isShallowEqual(validPosts, newValidPosts)) {
    return;
  }

  setAttributes({ validPosts: newValidPosts });

  // `mainDedupe` drops pins missing from `validPosts`, so only this pass applies a new pin.
  mainDedupe();
}
