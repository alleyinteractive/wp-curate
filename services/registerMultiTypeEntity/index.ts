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
 * @param postTypeString Comma-joined post type slugs.
 */
const registerMultiTypeEntity = (postTypeString: string): void => {
  if (!postTypeString.includes(',')) {
    return;
  }

  if (select('core').getEntityConfig('postType', postTypeString)) {
    return;
  }

  // @ts-expect-error The core store actions aren't fully typed.
  dispatch('core').addEntities([
    {
      kind: 'postType',
      name: postTypeString,
      baseURL: '/wp/v2/posts',
      baseURLParams: { context: 'edit' },
      label: postTypeString,
      supportsPagination: true,
    },
  ]);
};

export default registerMultiTypeEntity;
