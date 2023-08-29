import { registerPlugin } from '@wordpress/plugins';

import Deduplication from './deduplication';

registerPlugin(
  'wp-curate-deduplication',
  {
    // @ts-ignore
    icon: '',
    render: Deduplication,
  },
);
