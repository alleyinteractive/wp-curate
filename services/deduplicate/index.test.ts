/**
 * @jest-environment jsdom
 */
import { select } from '@wordpress/data';
import { mainDedupe } from './index';

const mockGetBlocks = jest.fn();
const mockGetBlocksByName = jest.fn();

jest.mock('@wordpress/data', () => ({
  select: jest.fn(),
  dispatch: jest.fn(() => ({ updateBlockAttributes: jest.fn() })),
  subscribe: jest.fn(),
}));
jest.mock('@wordpress/hooks', () => ({ addAction: jest.fn() }));
jest.mock('@wordpress/block-editor', () => ({ store: 'core/block-editor' }));

describe('mainDedupe', () => {
  beforeEach(() => {
    mockGetBlocks.mockReset().mockReturnValue([]);
    mockGetBlocksByName.mockReset();
    (select as jest.Mock).mockImplementation((store: string) => (
      store === 'core/editor'
        ? { getEditedPostAttribute: () => ({}) }
        : { getBlocks: mockGetBlocks, getBlocksByName: mockGetBlocksByName }
    ));
  });

  it('narrows to the post content block when there is exactly one', () => {
    mockGetBlocksByName.mockReturnValue(['post-content-id']);
    mainDedupe();
    expect(mockGetBlocks).toHaveBeenCalledWith('post-content-id');
  });

  it('uses the root blocks when there is no post content block', () => {
    mockGetBlocksByName.mockReturnValue([]);
    mainDedupe();
    expect(mockGetBlocks).toHaveBeenCalledWith();
  });

  it('uses the root blocks when there are multiple post content blocks', () => {
    mockGetBlocksByName.mockReturnValue(['a', 'b']);
    mainDedupe();
    expect(mockGetBlocks).toHaveBeenCalledWith();
  });
});
