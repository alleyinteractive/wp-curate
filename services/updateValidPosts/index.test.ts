import apiFetch from '@wordpress/api-fetch';
import { mainDedupe } from '../deduplicate';
import updateValidPosts from './index';

jest.mock('@wordpress/api-fetch', () => jest.fn());

jest.mock('../deduplicate', () => ({
  mainDedupe: jest.fn(),
}));

describe('updateValidPosts', () => {
  const setAttributes = jest.fn();

  const run = (overrides = {}) => updateValidPosts({
    manualPosts: [1, null, 2],
    postTypeString: 'post',
    includeFuturePosts: false,
    validPosts: [],
    setAttributes,
    isSuperseded: () => false,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (apiFetch as unknown as jest.Mock).mockResolvedValue([{ id: 1 }, { id: 2 }]);
  });

  it('writes changed valid posts and deduplicates', async () => {
    await run({ validPosts: [1] });

    expect(setAttributes).toHaveBeenCalledWith({ validPosts: [1, 2] });
    expect(mainDedupe).toHaveBeenCalled();
  });

  it('skips the write and deduplication when valid posts are unchanged', async () => {
    await run({ validPosts: [1, 2] });

    expect(setAttributes).not.toHaveBeenCalled();
    expect(mainDedupe).not.toHaveBeenCalled();
  });

  it('ignores entries without a numeric id', async () => {
    (apiFetch as unknown as jest.Mock).mockResolvedValue([{ id: 1 }, { id: '2' }, null]);

    await run();

    expect(setAttributes).toHaveBeenCalledWith({ validPosts: [1] });
  });

  it('writes an empty list without fetching when nothing is pinned', async () => {
    await run({ manualPosts: [null], validPosts: [1] });

    expect(apiFetch).not.toHaveBeenCalled();
    expect(setAttributes).toHaveBeenCalledWith({ validPosts: [] });
  });

  it('does nothing when a newer run superseded this one', async () => {
    await run({ validPosts: [1], isSuperseded: () => true });

    expect(setAttributes).not.toHaveBeenCalled();
    expect(mainDedupe).not.toHaveBeenCalled();
  });
});
