import apiFetch from '@wordpress/api-fetch';

type FetcherProps = [string | undefined, number];
type PostResponse = number[] | { id: number };

/**
 * Fetches the post data from the API.
 * @param url The API url.
 * @param currentPostId The current post ID.
 */
const queryBlockPostFetcher = (
  [url, currentPostId]: FetcherProps,
) => apiFetch<PostResponse>({ path: url })
  .then((response) => {
    let revisedResponse;
    // If the response is an array, filter out the current post.
    if (Array.isArray(response)) {
      revisedResponse = response.filter((item) => item !== currentPostId);
    } else if (response.id === currentPostId) {
      // Response is an object, if id is the current post, nullify it.
      revisedResponse = null;
    } else {
      revisedResponse = response;
    }
    return revisedResponse;
  });

export default queryBlockPostFetcher;
