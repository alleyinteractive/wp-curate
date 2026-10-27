// WordPress dependencies.
import apiFetch from '@wordpress/api-fetch';
import { resolveSelect } from '@wordpress/data';

// Internal dependencies.
import './index';

jest.mock('@wordpress/api-fetch');

const mockedApiFetch = apiFetch as unknown as jest.Mock;

const PAGE_BODY = {
  entity_kind: 'postType',
  has_more: true,
  ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  label: 'Test',
  order: 'desc',
  order_label: 'Test order',
  post_types: {},
  uses_context: [],
};

/**
 * A fake of the response that `apiFetch()` returns when it does not parse the response.
 *
 * @param body    Response body.
 * @param headers Response headers.
 */
function toResponse(body: object, headers: Record<string, string>) {
  return {
    headers: {
      get: (name: string) => (name in headers ? headers[name] : null),
    },
    json: async () => body,
  };
}

describe('wp-curate/channels store', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    mockedApiFetch.mockImplementation(async ({ path }: { path: string }) => {
      let response = toResponse(PAGE_BODY, { 'X-WP-Total': '30', 'X-WP-TotalPages': '3' });

      if (path.includes('search=hello')) {
        response = toResponse(
          { has_more: false, ids: [3] },
          { 'X-WP-Total': '21', 'X-WP-TotalPages': '2' },
        );
      }

      return response;
    });
  });

  it('ignores a call without a count, instead of storing an empty channel', async () => {
    const {
      getChannel,
    } = resolveSelect('wp-curate/channels') as any;

    await getChannel('missing_count', {}, {});

    expect(mockedApiFetch).not.toHaveBeenCalled();

    const record = await getChannel('missing_count', {}, {}, 10);

    expect(record.ids).toHaveLength(10);
  });

  it('loads a page of search results by itself, apart from the whole channel', async () => {
    const {
      getChannel,
      getChannelPage,
    } = resolveSelect('wp-curate/channels') as any;

    const results = await getChannelPage('search', {}, {}, 'hello', 2, 20);
    const record = await getChannel('search', {}, {}, 10);

    expect(results.ids).toEqual([3]);
    expect(results.total).toBe(21);
    expect(results.total_pages).toBe(2);
    expect(record.ids).toHaveLength(10);
    expect(record).not.toHaveProperty('total');
    expect(mockedApiFetch).toHaveBeenCalledTimes(2);
    expect(mockedApiFetch.mock.calls[0][0].path).toContain('page=2&per_page=20&search=hello');
    expect(mockedApiFetch.mock.calls[1][0].path).not.toContain('search=');
  });

  it('counts a page without total headers as 0', async () => {
    const {
      getChannelPage,
    } = resolveSelect('wp-curate/channels') as any;

    mockedApiFetch.mockImplementation(async () => toResponse(PAGE_BODY, {}));

    const page = await getChannelPage('no_headers', {}, {}, '', 1, 10);

    expect(page.ids).toHaveLength(10);
    expect(page.total).toBe(0);
    expect(page.total_pages).toBe(0);
  });

  it('ignores a page size that the REST API rejects', async () => {
    const {
      getChannelPage,
    } = resolveSelect('wp-curate/channels') as any;

    await getChannelPage('too_many', {}, {}, '', 1, 101);

    expect(mockedApiFetch).not.toHaveBeenCalled();
  });

  it('sends the arguments, and keeps a separate record for each set of them', async () => {
    const {
      getChannel,
    } = resolveSelect('wp-curate/channels') as any;

    await getChannel('with_args', { term: 7 }, {}, 10);
    await getChannel('with_args', { term: 8 }, {}, 10);

    expect(mockedApiFetch).toHaveBeenCalledTimes(2);
    expect(decodeURIComponent(mockedApiFetch.mock.calls[0][0].path)).toContain('args[term]=7');
    expect(decodeURIComponent(mockedApiFetch.mock.calls[1][0].path)).toContain('args[term]=8');
  });

  it('loads a list of channels for each context, with whether each one is available', async () => {
    mockedApiFetch.mockImplementation(async ({ path }: { path: string }) => [
      {
        arg_fields: [],
        is_available: path.includes('context%5BpostId%5D=7'),
        is_default: false,
        label: 'In issue',
        name: 'in_issue',
        uses_context: ['postId'],
      },
    ]);

    const {
      getChannelsInContext,
    } = resolveSelect('wp-curate/channels') as any;

    const [inIssue] = await getChannelsInContext({ postId: 7 });
    const [elsewhere] = await getChannelsInContext({ postId: 8 });

    expect(inIssue.is_available).toBe(true);
    expect(inIssue.uses_context).toEqual(['postId']);
    expect(elsewhere.is_available).toBe(false);
  });
});
