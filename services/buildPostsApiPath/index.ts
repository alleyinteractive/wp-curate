import { addQueryArgs } from '@wordpress/url';

interface PostsApiPathProps {
  search: string,
  offset: number,
  postType: string,
  status: 'publish',
  perPage: 20,
  orderBy: string,
  currentPostId: number
}

export default function buildPostsApiPath(pathProps: PostsApiPathProps) {
  return addQueryArgs('/wp-curate/v1/posts', {
    search: pathProps.search,
    offset: pathProps.offset,
    post_type: pathProps.postType,
    status: pathProps.status,
    per_page: pathProps.perPage,
    orderby: pathProps.orderBy,
    current_post_id: pathProps.currentPostId,
  });
}
