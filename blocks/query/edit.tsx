/* eslint-disable camelcase */
import useSWRImmutable from 'swr/immutable';
import classnames from 'classnames';
import { useDebounce } from '@uidotdev/usehooks';
import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import {
  useEffect,
} from '@wordpress/element';
import { addQueryArgs } from '@wordpress/url';

import { Template } from '@wordpress/blocks';
import type { WP_REST_API_Posts as WpRestApiPosts } from 'wp-types'; // eslint-disable-line camelcase
import apiFetch from '@wordpress/api-fetch';

import type {
  EditProps,
  Option,
} from './types';

import { mainDedupe } from '../../services/deduplicate';
import buildPostsApiPath from '../../services/buildPostsApiPath';
import buildTermQueryArgs from '../../services/buildTermQueryArgs';
import queryBlockPostFetcher from '../../services/queryBlockPostFetcher';

import QueryControls from '../../components/QueryControls';
import './index.scss';

interface PostTypeOrTerm {
  name: string;
  slug: string;
  rest_base?: string;
}

interface Window {
  wpCurateQueryBlock: {
    allowedPostTypes: PostTypeOrTerm[];
    allowedTaxonomies: PostTypeOrTerm[];
    parselyAvailable: string,
    maxPosts: number,
  };
}

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 * @return {WPElement} Element to render.
 */
export default function Edit({
  attributes: {
    backfillPosts = [],
    deduplication = 'inherit',
    minNumberOfPosts = 1,
    numberOfPosts = 5,
    offset = 0,
    posts: manualPosts = [],
    postTypes = [],
    searchTerm = '',
    terms = {},
    termRelations = {},
    taxRelation = 'AND',
    orderby = 'date',
    moveData = {},
  },
  setAttributes,
}: EditProps) {
  const {
    wpCurateQueryBlock: {
      allowedPostTypes = [],
      allowedTaxonomies = [],
      parselyAvailable = 'false',
      maxPosts = 10,
    } = {},
  } = (window as any as Window);

  if (!postTypes.length) {
    setAttributes({ postTypes: allowedPostTypes.map((type) => type.slug) });
  }

  // @ts-ignore
  const [isPostDeduplicating, postTypeObject, uniquePinnedPosts] = useSelect(
    (select) => {
      // @ts-ignore
      const editor = select('core/editor');

      // @ts-ignore
      const type = editor.getEditedPostAttribute('type');
      // @ts-ignore
      const meta = editor.getEditedPostAttribute('meta');

      return [
        // It's possible for usePostMetaValue() to run here before useEntityProp() is available.
        Boolean(meta?.wp_curate_deduplication),
        // @ts-ignore
        type ? select('core').getPostType(type) : null,
        Boolean(meta?.wp_curate_unique_pinned_posts),
      ];
    },
  );

  const debouncedSearchTerm = useDebounce(searchTerm ?? '', 500);

  const taxCount = allowedTaxonomies.length;

  const termQueryArgs = buildTermQueryArgs(
    allowedTaxonomies,
    terms,
    termRelations,
    taxRelation,
  );

  const manualPostIds = manualPosts.map((post) => (post ?? null)).join(',');
  const currentPostId = Number(useSelect((select: any) => select('core/editor').getCurrentPostId(), []));
  const postTypeString = postTypes.join(',');

  // Construct the API path using query args.
  const path = `${buildPostsApiPath({
    search: debouncedSearchTerm,
    offset,
    postType: postTypeString,
    status: 'publish',
    perPage: 20,
    orderBy: orderby,
    currentPostId,
  })}&${termQueryArgs}`;

  // Use SWR to fetch data.
  const { data, error } = useSWRImmutable(
    [path, currentPostId],
    queryBlockPostFetcher,
  );

  // Handle the fetched data.
  useEffect(() => {
    if (data && !error) {
      setAttributes({ backfillPosts: data });
    }
  }, [data, error, setAttributes]);

  // Update the query when the backfillPosts change.
  // The query is passed via context to the core/post-template block.
  useEffect(() => {
    if (data && !error) {
      mainDedupe(['wp-curate/query', 'wp-curate/subquery']);
    }
  }, [
    manualPostIds,
    backfillPosts,
    numberOfPosts,
    setAttributes,
    postTypeString,
    isPostDeduplicating,
    deduplication,
    uniquePinnedPosts,
    data,
    error,
  ]);

  // Make sure all the manual posts are still valid.
  useEffect(() => {
    const updateValidPosts = async () => {
      const postsToInclude = manualPosts.filter((id) => id !== null).join(',');
      let validPosts: Number[] = [];

      if (postsToInclude.length > 0) {
        validPosts = await apiFetch({
          path: addQueryArgs(
            '/wp/v2/posts',
            {
              offset: 0,
              orderby: 'include',
              per_page: postsToInclude.length,
              type: 'post',
              include: postsToInclude,
              _locale: 'user',
            },
          ),
        }).then((response) => (response as any as WpRestApiPosts).map((post) => post.id));
      }

      setAttributes({ validPosts });
      mainDedupe();
    };
    updateValidPosts();
  }, [manualPosts, setAttributes]);

  for (let i = 0; i < numberOfPosts; i += 1) {
    if (!manualPosts[i]) {
      manualPosts[i] = null; // eslint-disable-line no-param-reassign
    }
  }

  manualPosts = manualPosts.slice(0, numberOfPosts); // eslint-disable-line no-param-reassign

  const TEMPLATE: Template[] = [
    [
      'core/post-template',
      {},
      [
        [
          'wp-curate/post',
          {},
          [
            ['wp-curate/post-title', {}],
            ['core/post-excerpt', {}],
          ],
        ],
      ],
    ],
  ];

  const displayTypes: Option[] = allowedPostTypes.map((type) => ({
    label: type.name,
    value: type.slug,
  }));

  return (
    <>
      <div {...useBlockProps({
        className: classnames(
          { 'wp-curate-query-block--move': moveData.postId },
        ),
      })}
      >
        <InnerBlocks template={TEMPLATE} />
      </div>
      <QueryControls
        allowedPostTypes={allowedPostTypes}
        allowedTaxonomies={allowedTaxonomies}
        deduplication={deduplication}
        displayTypes={displayTypes}
        isPostDeduplicating={isPostDeduplicating}
        manualPosts={manualPosts}
        maxPosts={maxPosts}
        minNumberOfPosts={minNumberOfPosts}
        numberOfPosts={numberOfPosts}
        offset={offset}
        orderby={orderby}
        parselyAvailable={parselyAvailable}
        postTypeObject={postTypeObject}
        postTypes={postTypes}
        searchTerm={searchTerm}
        setAttributes={setAttributes}
        taxCount={taxCount}
        taxRelation={taxRelation}
        termRelations={termRelations}
        terms={terms}
      />
    </>
  );
}
