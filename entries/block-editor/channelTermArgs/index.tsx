// WordPress dependencies.
import { registerPlugin } from '@wordpress/plugins';

// Internal dependencies.
import ChannelTermArgs from './channel-term-args';

registerPlugin(
  'wp-curate-channel-term-args',
  {
    // @ts-ignore
    icon: '',
    render: ChannelTermArgs,
  },
);
