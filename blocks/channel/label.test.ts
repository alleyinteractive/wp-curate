// WordPress dependencies.
import { select } from '@wordpress/data';

// Internal dependencies.
import label from './label';

jest.mock('@wordpress/data', () => ({
  select: jest.fn(),
  useSelect: jest.fn(),
}));

const mockedSelect = select as unknown as jest.Mock;

// The list of channels, with the default.
const CHANNELS = [
  {
    args: {},
    default: true,
    eligible: true,
    label: 'Latest Posts',
    name: 'post_latest',
    uses_context: [],
  },
  {
    args: {},
    default: false,
    eligible: true,
    label: 'Latest Pages',
    name: 'page_latest',
    uses_context: [],
  },
];

/**
 * Make `select()` give the list of channels, or null while it loads.
 *
 * @param channels The list of channels.
 */
function withChannels(channels: object[] | null) {
  mockedSelect.mockImplementation(() => ({
    getChannels: () => channels,
  }));
}

describe('Channel block label', () => {
  beforeEach(() => {
    withChannels(CHANNELS);
  });

  it('is the label of the block channel in List View', () => {
    expect(label({ channel: { name: 'page_latest' } }, { context: 'list-view' })).toBe('Latest Pages');
  });

  it('is the label of the default channel for a block without a channel name', () => {
    expect(label({ channel: { name: '' } }, { context: 'list-view' })).toBe('Latest Posts');
  });

  it('is a name from the Rename option before the channel', () => {
    const attributes = { channel: { name: 'page_latest' }, metadata: { name: 'Sports section' } };

    expect(label(attributes, { context: 'list-view' })).toBe('Sports section');
    expect(label(attributes, { context: 'breadcrumb' })).toBe('Sports section');
  });

  it('is the block title outside List View', () => {
    expect(label({ channel: { name: 'page_latest' } }, { context: 'breadcrumb' })).toBeUndefined();
  });

  it('is the block title for a channel that is not registered', () => {
    expect(label({ channel: { name: 'removed' } }, { context: 'list-view' })).toBeUndefined();
  });

  it('is the block title while the list of channels loads', () => {
    withChannels(null);

    expect(label({ channel: { name: 'page_latest' } }, { context: 'list-view' })).toBeUndefined();
  });
});
