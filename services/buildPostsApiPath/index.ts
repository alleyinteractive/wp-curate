import { addQueryArgs } from '@wordpress/url';

interface PostsApiPathProps {
  search: string,
  offset: number,
  postType: string,
  status: 'publish',
  perPage: 20,
  order: 'asc' | 'desc',
  orderBy: string,
  metaKey: string,
  currentPostId: number,
  backfillDays: number,
}

export default function buildPostsApiPath(pathProps: PostsApiPathProps) {
  return addQueryArgs('/wp-curate/v1/posts', {
    search: pathProps.search,
    offset: pathProps.offset,
    post_type: pathProps.postType,
    status: pathProps.status,
    per_page: pathProps.perPage,
    order: pathProps.order,
    orderby: pathProps.orderBy,
    meta_key: pathProps.metaKey,
    current_post_id: pathProps.currentPostId,
    backfill_days: pathProps.backfillDays,
  });
}
