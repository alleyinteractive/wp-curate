import { dispatch, select } from '@wordpress/data';
import registerMultiTypeEntity from './index';

jest.mock('@wordpress/core-data', () => ({
  store: 'core',
}));

jest.mock('@wordpress/data', () => ({
  dispatch: jest.fn(),
  select: jest.fn(),
}));

describe('registerMultiTypeEntity', () => {
  const addEntities = jest.fn();
  const invalidateResolution = jest.fn();
  const getEntityConfig = jest.fn();
  const getCachedResolvers = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (dispatch as jest.Mock).mockReturnValue({
      addEntities,
      invalidateResolution,
    });
    (select as jest.Mock).mockReturnValue({ getEntityConfig, getCachedResolvers });
    getCachedResolvers.mockReturnValue({});
  });

  it('does nothing for a single post type', () => {
    registerMultiTypeEntity('post');

    expect(getEntityConfig).not.toHaveBeenCalled();
    expect(addEntities).not.toHaveBeenCalled();
  });

  it('registers an entity named for the joined post types', () => {
    getEntityConfig.mockReturnValue(undefined);

    registerMultiTypeEntity('post,page');

    expect(getEntityConfig).toHaveBeenCalledWith('postType', 'post,page');
    expect(addEntities).toHaveBeenCalledTimes(1);
    expect(addEntities).toHaveBeenCalledWith([
      expect.objectContaining({
        kind: 'postType',
        name: 'post,page',
        baseURL: '/wp/v2/posts',
        baseURLParams: { context: 'edit' },
      }),
    ]);
  });

  it('retries entity requests made before the entity existed', () => {
    getEntityConfig.mockReturnValue(undefined);
    const query = { per_page: 10, context: 'view' };
    getCachedResolvers.mockReturnValue({
      getEntityRecords: new Map([
        [['postType', 'post,page', query], { status: 'finished' }],
      ]),
    });

    registerMultiTypeEntity('post,page');

    expect(invalidateResolution).toHaveBeenCalledWith(
      'getEntityRecords',
      ['postType', 'post,page', query],
    );
    expect(addEntities.mock.invocationCallOrder[0]).toBeLessThan(
      invalidateResolution.mock.invocationCallOrder[0],
    );
  });

  it('does not retry requests for other entities', () => {
    getEntityConfig.mockReturnValue(undefined);
    getCachedResolvers.mockReturnValue({
      getEntityRecords: new Map([
        [['postType', 'post', { per_page: 10 }], { status: 'finished' }],
        [['postType', 'post,page,attachment', {}], { status: 'finished' }],
        [['taxonomy', 'category', {}], { status: 'finished' }],
      ]),
    });

    registerMultiTypeEntity('post,page');

    expect(invalidateResolution).not.toHaveBeenCalled();
  });

  it('does not register the entity twice', () => {
    getEntityConfig.mockReturnValue({ kind: 'postType', name: 'post,page' });

    registerMultiTypeEntity('post,page');

    expect(addEntities).not.toHaveBeenCalled();
    expect(invalidateResolution).not.toHaveBeenCalled();
  });
});
