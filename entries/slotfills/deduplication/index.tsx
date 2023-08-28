import { registerPlugin } from '@wordpress/plugins';
import { group } from '@wordpress/icons';

import Deduplication from './deduplication';

registerPlugin(
  'wp-curate-deduplication',
  {
    // @ts-ignore
    icon: group,
    render: Deduplication,
  },
);
