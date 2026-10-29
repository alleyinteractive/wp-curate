// WordPress dependencies.
import { store as blockEditorStore } from '@wordpress/block-editor';
import { store as coreStore } from '@wordpress/core-data';
import { select } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';

// Plugin dependencies.
import { channelQueueIds } from '../../hooks/useChannelQueue';
import customBlockName from '../../services/customBlockName';

/**
 * The post type of the post that a block shows, or an empty string while it loads.
 *
 * The label callback gets the attributes but not the client ID. The block editor store gives each
 * block the same attributes object until they change, so the block with that object is this one.
 *
 * @param attributes Block attributes.
 */
function toShownPostType(attributes: Record<string, unknown>): string {
  const {
    getBlockAttributes,
    getBlocksByName,
  } = select(blockEditorStore) as any;

  const {
    getTypeOfPostInChannel,
  } = select('wp-curate/channels') as any;

  const {
    postType: pinnedPostType,
    ref,
  } = attributes;

  let postType = '';

  // A pinned post can be past the IDs that have loaded, so the block saves its post type.
  if (Number.isInteger(ref) && (ref as number) > 0 && typeof pinnedPostType === 'string') {
    postType = pinnedPostType;
  }

  if (postType !== '') {
    return postType;
  }

  const clientId = getBlocksByName('wp-curate/single-post').find(
    (candidate: string) => getBlockAttributes(candidate) === attributes,
  );

  let ids: number[] | null = null;

  if (typeof clientId === 'string') {
    ids = channelQueueIds(select, clientId);
  }

  if (ids !== null && ids.length > 0) {
    postType = getTypeOfPostInChannel(ids[0]);
  }

  return postType;
}

/**
 * The block's name in List View, from the type of the post that it shows.
 *
 * A name from the "Rename" option comes first, in List View and the breadcrumb, as core does for
 * blocks without their own label. Without one, the name is the block title while the post loads,
 * or if there is no post.
 *
 * @param attributes      Block attributes.
 * @param options         Label options.
 * @param options.context Where the label shows.
 * @return The name, or undefined to use the block title.
 */
export default function label(
  attributes: Record<string, unknown>,
  {
    context,
  }: { context: string },
): string | undefined {
  let out: string | undefined;

  const customName = customBlockName(attributes);

  if ((context === 'list-view' || context === 'breadcrumb') && customName !== '') {
    return customName;
  }

  if (context !== 'list-view') {
    return out;
  }

  const postType = toShownPostType(attributes);

  let singularName = '';

  if (postType !== '') {
    const postTypeObject = select(coreStore).getPostType(postType);

    if (postTypeObject && typeof postTypeObject.labels.singular_name === 'string') {
      singularName = postTypeObject.labels.singular_name;
    }
  }

  if (singularName !== '') {
    /* translators: %s: Post type singular name, such as "Page". */
    out = sprintf(__('Single %s', 'wp-curate'), singularName);
  }

  return out;
}
