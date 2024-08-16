import apiFetch from '@wordpress/api-fetch';

type FetcherProps = [string | undefined, number];

const queryBlockPostFetcher = ([url, currentPostId]: FetcherProps) => apiFetch({ path: url })
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
