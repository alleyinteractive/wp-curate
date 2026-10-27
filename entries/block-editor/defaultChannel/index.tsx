// WordPress dependencies.
import { registerPlugin } from '@wordpress/plugins';

// Internal dependencies.
import DefaultChannel from './default-channel';

registerPlugin(
  'wp-curate-default-channel',
  {
    // @ts-ignore
    icon: '',
    render: DefaultChannel,
  },
);
