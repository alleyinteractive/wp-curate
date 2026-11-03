import type { WP_REST_API_Posts as WpRestApiPosts } from 'wp-types'; // eslint-disable-line camelcase
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
    newValidPosts = await apiFetch({
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
    }).then((response) => (response as any as WpRestApiPosts).map((post) => post.id));
  }

  // A newer run started while this request was in flight, and `validPosts` may be stale.
  if (isSuperseded()) {
    return;
  }

  // An equal write still edits the post, which remounts every other template preview.
  if (isShallowEqual(validPosts, newValidPosts)) {
    return;
  }

  setAttributes({ validPosts: newValidPosts });

  // `mainDedupe` drops pins missing from `validPosts`, so this pass applies a new pin.
  mainDedupe();
}
