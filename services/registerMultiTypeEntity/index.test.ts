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
  const invalidateResolutionForStoreSelector = jest.fn();
  const getEntityConfig = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (dispatch as jest.Mock).mockReturnValue({
      addEntities,
      invalidateResolutionForStoreSelector,
    });
    (select as jest.Mock).mockReturnValue({ getEntityConfig });
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

    registerMultiTypeEntity('post,page');

    expect(invalidateResolutionForStoreSelector).toHaveBeenCalledWith('getEntityRecords');
    expect(addEntities.mock.invocationCallOrder[0]).toBeLessThan(
      invalidateResolutionForStoreSelector.mock.invocationCallOrder[0],
    );
  });

  it('does not register the entity twice', () => {
    getEntityConfig.mockReturnValue({ kind: 'postType', name: 'post,page' });

    registerMultiTypeEntity('post,page');

    expect(addEntities).not.toHaveBeenCalled();
    expect(invalidateResolutionForStoreSelector).not.toHaveBeenCalled();
  });
});
