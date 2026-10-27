// Internal dependencies.
import { toBlockChannel } from './index';

jest.mock('@wordpress/data', () => ({
  useSelect: jest.fn(),
}));

// The list of channels, with the global default.
const CHANNELS = [
  { is_default: false, label: 'Other', name: 'other' },
  { is_default: true, label: 'Global', name: 'global_default' },
];

/**
 * A `select` function with the given post default channel and channels.
 *
 * @param defaultChannel The post's default channel, or undefined for an editor without a post.
 * @param channels       The list of channels, or null while it loads.
 */
function fakeSelect(defaultChannel?: string, channels: object[] | null = CHANNELS) {
  return (storeName: string) => {
    let selectors: object | undefined;

    if (storeName === 'wp-curate/channels') {
      selectors = {
        getChannels: () => channels,
      };
    }

    if (storeName === 'core/editor' && defaultChannel !== undefined) {
      selectors = {
        getEditedPostAttribute: () => ({ wp_curate_default_channel: defaultChannel }),
      };
    }

    return selectors;
  };
}

describe('toBlockChannel', () => {
  it('uses the block\'s own channel', () => {
    expect(toBlockChannel(fakeSelect('other'), 'own', undefined)).toBe('own');
  });

  it('uses the channel from block context instead of its own', () => {
    expect(toBlockChannel(fakeSelect('other'), 'own', 'from_context')).toBe('from_context');
  });

  it('uses the channel from block context without its own', () => {
    expect(toBlockChannel(fakeSelect('other'), '', 'from_context')).toBe('from_context');
  });

  it('uses the post default channel without its own or one from context', () => {
    expect(toBlockChannel(fakeSelect('other'), '', undefined)).toBe('other');
  });

  it('uses no channel inside a Many Posts block without one', () => {
    expect(toBlockChannel(fakeSelect('other'), '', '')).toBe('');
  });

  it('uses the global default channel in an editor without a post', () => {
    expect(toBlockChannel(fakeSelect(), '', undefined)).toBe('global_default');
  });

  it('uses the global default channel for a post without a default', () => {
    expect(toBlockChannel(fakeSelect(''), '', undefined)).toBe('global_default');
  });

  it('uses the global default channel for a post default that is not registered', () => {
    expect(toBlockChannel(fakeSelect('removed'), '', undefined)).toBe('global_default');
  });

  it('is null while the list of channels loads', () => {
    expect(toBlockChannel(fakeSelect('', null), '', undefined)).toBeNull();
  });

  it('does not need the list of channels when the block has a channel', () => {
    expect(toBlockChannel(fakeSelect('', null), 'own', undefined)).toBe('own');
  });

  it('has no channel when no channels are registered', () => {
    expect(toBlockChannel(fakeSelect('', []), '', undefined)).toBe('');
  });
});
