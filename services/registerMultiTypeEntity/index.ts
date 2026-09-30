import { store as coreStore } from '@wordpress/core-data';
import { dispatch, select } from '@wordpress/data';

/**
 * Registers a core-data entity for a comma-joined list of post types.
 *
 * `core/post-template` passes `query.postType` to core-data as a single entity name.
 * A comma-joined string isn't a registered entity, so core-data never issues a request
 * and the template spins forever. The posts endpoint already accepts `type=a,b` in the
 * edit context (see Rest_Api::add_type_param), so we register the joined name as an
 * entity backed by `/wp/v2/posts`. Records keep their own `type`, so each item still
 * renders with the correct post type.
 *
 * That filter only checks `post_type_exists()`, so it doesn't matter whether a type has
 * `show_in_rest` or a custom `rest_base`. It does require a logged-in user and
 * `context=edit`, which is why the entity sets `context: 'edit'`, and unknown slugs are
 * silently dropped.
 *
 * @param postTypeString Comma-joined post type slugs.
 */
const registerMultiTypeEntity = (postTypeString: string): void => {
  if (!postTypeString.includes(',')) {
    return;
  }

  if (select(coreStore).getEntityConfig('postType', postTypeString)) {
    return;
  }

  const coreDispatch = dispatch(coreStore);

  coreDispatch.addEntities([
    {
      kind: 'postType',
      name: postTypeString,
      baseURL: '/wp/v2/posts',
      baseURLParams: { context: 'edit' },
      label: postTypeString,
      supportsPagination: true,
    },
  ]);

  // If `core/post-template` asked for this entity before it existed, core-data resolved that
  // request as a no-op and won't retry it on its own. Invalidating makes it run again.
  coreDispatch.invalidateResolutionForStoreSelector('getEntityRecords');
};

export default registerMultiTypeEntity;
