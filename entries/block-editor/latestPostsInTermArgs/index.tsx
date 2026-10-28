// WordPress dependencies.
import { registerPlugin } from '@wordpress/plugins';

// Internal dependencies.
import LatestPostsInTermArgs from './latest-posts-in-term-args';

registerPlugin(
  'wp-curate-latest-posts-in-term-args',
  {
    // @ts-ignore
    icon: '',
    render: LatestPostsInTermArgs,
  },
);
