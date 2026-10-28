// Internal dependencies.
import {
  canBeDefaultChannel,
  channelContext,
  channelsContext,
  hasEveryChannelArg,
  pickChannelArgs,
  toBlockChannel,
  toBlockChannelArgs,
  toChannelArgs,
  toChannelName,
} from './index';

jest.mock('@wordpress/data', () => ({
  useSelect: jest.fn(),
}));

// The list of channels, with the global default.
const CHANNELS = [
  {
    arg_fields: [],
    is_available: true,
    is_default: false,
    label: 'Other',
    name: 'other',
    uses_context: [],
  },
  {
    arg_fields: [],
    is_available: true,
    is_default: true,
    label: 'Global',
    name: 'global_default',
    uses_context: [],
  },
  {
    arg_fields: [{
      id: 'term', label: 'Category', required: true,
    }],
    is_available: true,
    is_default: false,
    label: 'In category',
    name: 'post_category_latest',
    uses_context: [],
  },
  {
    arg_fields: [],
    is_available: false,
    is_default: false,
    label: 'In issue',
    name: 'in_issue',
    uses_context: ['postId'],
  },
];

const TERM_FIELDS = [{
  id: 'term', label: 'Category', required: true,
}];

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
    expect(toBlockChannel(fakeSelect('other'), 'own', { name: 'from_context' })).toBe('from_context');
  });

  it('uses the channel from block context without its own', () => {
    expect(toBlockChannel(fakeSelect('other'), '', { name: 'from_context' })).toBe('from_context');
  });

  it('uses the post default channel without its own or one from context', () => {
    expect(toBlockChannel(fakeSelect('other'), '', undefined)).toBe('other');
  });

  it('uses no channel inside a Channel Loop block without one', () => {
    expect(toBlockChannel(fakeSelect('other'), '', { name: '' })).toBe('');
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

  it('uses the global default channel for a post default that reads arguments', () => {
    expect(toBlockChannel(fakeSelect('post_category_latest'), '', undefined)).toBe('global_default');
  });

  it('uses the global default channel for a post default that reads block context', () => {
    expect(toBlockChannel(fakeSelect('in_issue'), '', undefined)).toBe('global_default');
  });
});

describe('canBeDefaultChannel', () => {
  it('is true for a channel that reads no arguments or context', () => {
    expect(canBeDefaultChannel(CHANNELS[0])).toBe(true);
  });

  it('is false for a channel that reads arguments', () => {
    expect(canBeDefaultChannel(CHANNELS[2])).toBe(false);
  });

  it('is false for a channel that reads block context', () => {
    expect(canBeDefaultChannel(CHANNELS[3])).toBe(false);
  });
});

describe('channelContext', () => {
  const context = { postId: 7, postType: 'magazine_issue', query: {} };

  it('keeps only the context that the channel reads', () => {
    expect(channelContext(fakeSelect(''), 'in_issue', context)).toEqual({ postId: 7 });
  });

  it('keeps no context for a channel that reads none', () => {
    expect(channelContext(fakeSelect(''), 'other', context)).toEqual({});
  });

  it('keeps no context while the list of channels loads', () => {
    expect(channelContext(fakeSelect('', null), 'in_issue', context)).toEqual({});
  });
});

describe('channelsContext', () => {
  it('keeps only the context that any channel reads', () => {
    expect(channelsContext(fakeSelect(''), { postId: 7, postType: 'post' })).toEqual({ postId: 7 });
  });

  it('is null while the list of channels loads', () => {
    expect(channelsContext(fakeSelect('', null), { postId: 7 })).toBeNull();
  });
});

describe('toChannelName', () => {
  it('reads the name of a channel', () => {
    expect(toChannelName({ args: { term: 5 }, name: 'post_category_latest' })).toBe('post_category_latest');
  });

  it('reads a channel without a name as the post default', () => {
    expect(toChannelName({})).toBe('');
  });

  it('reads a value that is not an object as no channel', () => {
    expect(toChannelName('post_category_latest')).toBeNull();
    expect(toChannelName(undefined)).toBeNull();
  });
});

describe('toChannelArgs', () => {
  it('reads the arguments of a channel', () => {
    expect(toChannelArgs({ args: { term: 5 }, name: 'post_category_latest' })).toEqual({ term: 5 });
  });

  it('reads a channel without arguments as none', () => {
    expect(toChannelArgs({ name: 'post_category_latest' })).toEqual({});
    expect(toChannelArgs({ args: [5], name: 'post_category_latest' })).toEqual({});
  });
});

describe('toBlockChannelArgs', () => {
  it('uses the block\'s own arguments', () => {
    expect(toBlockChannelArgs({ args: { term: 5 }, name: 'post_category_latest' }, undefined)).toEqual({ term: 5 });
  });

  it('uses the arguments from block context inside a Channel Loop block, instead of its own', () => {
    expect(toBlockChannelArgs(
      { args: { term: 5 }, name: 'post_category_latest' },
      { args: { term: 6 }, name: 'post_category_latest' },
    )).toEqual({ term: 6 });
  });

  it('uses no arguments inside a Channel Loop block without them', () => {
    expect(toBlockChannelArgs({ args: { term: 5 }, name: 'post_category_latest' }, { name: '' })).toEqual({});
  });
});

describe('pickChannelArgs', () => {
  it('keeps only the arguments that the channel reads', () => {
    expect(pickChannelArgs(TERM_FIELDS, { stale: 1, term: 5 })).toEqual({ term: 5 });
  });
});

describe('hasEveryChannelArg', () => {
  it('is true when the block gives each argument', () => {
    expect(hasEveryChannelArg(TERM_FIELDS, { term: 5 })).toBe(true);
  });

  it('is false when the block does not give an argument', () => {
    expect(hasEveryChannelArg(TERM_FIELDS, {})).toBe(false);
  });

  it('is true for a channel that reads no arguments', () => {
    expect(hasEveryChannelArg([], {})).toBe(true);
  });

  it('ignores an argument that the channel does not need', () => {
    const fields = [{
      id: 'search', label: 'Search', required: false,
    }];

    expect(hasEveryChannelArg(fields, {})).toBe(true);
  });

  it('is false when the block gives an empty list for an argument that the channel needs', () => {
    const fields = [{
      id: 'post_types', label: 'Post Types', required: true,
    }];

    expect(hasEveryChannelArg(fields, { post_types: [] })).toBe(false);
    expect(hasEveryChannelArg(fields, { post_types: ['post'] })).toBe(true);
  });
});
