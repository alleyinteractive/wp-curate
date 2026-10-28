// WordPress dependencies.
import { registerPlugin } from '@wordpress/plugins';

// Internal dependencies.
import FreeForAllArgs from './free-for-all-args';

registerPlugin(
  'wp-curate-free-for-all-args',
  {
    // @ts-ignore
    icon: '',
    render: FreeForAllArgs,
  },
);
