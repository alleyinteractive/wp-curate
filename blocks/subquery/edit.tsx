/* eslint-disable camelcase */
import { useEffect } from 'react';
import useSWRImmutable from 'swr/immutable';
import { useDebounce } from '@uidotdev/usehooks';
import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';
import { useSelect, select } from '@wordpress/data';
import { addQueryArgs } from '@wordpress/url';
import { __ } from '@wordpress/i18n';

import { Template } from '@wordpress/blocks';
import apiFetch from '@wordpress/api-fetch';
import { v4 as uuid } from 'uuid'; // eslint-disable-line import/no-unresolved

import type {
  EditProps,
  Option,
} from '../query/types';

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
    includeFuturePosts: boolean,
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
    maxNumberOfPosts = 10,
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
    order = 'desc',
    metaKey = '',
    uniqueId = '',
    validPosts = [],
  },
  setAttributes,
  context: {
    postId,
    query: {
      include = '',
    } = {},
  },
}: EditProps) {
  const queryInclude = include.split(',').map((id: string) => parseInt(id, 10));
  const index = queryInclude.findIndex((id: number) => id === postId);
  const isFirstPost = index === 0;

  const {
    wpCurateQueryBlock: {
      allowedPostTypes = [],
      allowedTaxonomies = [],
      parselyAvailable = 'false',
      maxPosts = 10,
      includeFuturePosts,
    } = {},
  } = (window as any as Window);

  // @ts-ignore
  const [
    isPostDeduplicating,
    postTypeObject,
    uniquePinnedPosts,
  ] = useSelect(
    (innerSelect) => {
      // @ts-ignore
      const editor = innerSelect('core/editor');

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
    [],
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
  const currentPostId = Number(useSelect((innerSelect: any) => innerSelect('core/editor').getCurrentPostId(), []));
  const postTypeString = postTypes.join(',');

  // Construct the API path using query args.
  const path = `${buildPostsApiPath({
    search: debouncedSearchTerm,
    offset,
    postType: postTypeString,
    status: 'publish',
    perPage: 20,
    order: 'desc',
    orderBy: orderby,
    metaKey: '',
    currentPostId,
  })}&${termQueryArgs}`;

  useEffect(() => {
    if (!isFirstPost) {
      return;
    }

    if (postTypes?.length > 0) {
      return;
    }

    setAttributes({ postTypes: allowedPostTypes.map(({ slug }) => slug) });
  }, [allowedPostTypes, isFirstPost, postTypes?.length, setAttributes]);

  // Use SWR to fetch data.
  const { data, error } = useSWRImmutable(
    isFirstPost ? [path, currentPostId] : null,
    queryBlockPostFetcher,
  );

  useEffect(() => {
    if (!uniqueId) {
      setAttributes({ uniqueId: uuid() });
    }
  }, [setAttributes, uniqueId]);

  // Handle the fetched data.
  useEffect(() => {
    if (!isFirstPost) {
      return;
    }
    if (data && !error) {
      setAttributes({ backfillPosts: data });
    }
  }, [data, error, setAttributes, isFirstPost]);

  /**
   * Update the query when the backfillPosts change.
   * The query is passed via context to the core/post-template block.
   */
  useEffect(() => {
    if (!isFirstPost) {
      return;
    }
    if (data && !error && backfillPosts.length > 0) {
      mainDedupe();
    }
  }, [
    isFirstPost,
    manualPostIds,
    backfillPosts,
    numberOfPosts,
    postTypeString,
    isPostDeduplicating,
    deduplication,
    uniquePinnedPosts,
    data,
    error,
  ]);

  /**
   * Update validPosts based on manualPosts.
   */
  useEffect(() => {
    if (!isFirstPost) {
      return;
    }

    const updateValidPosts = async () => {
      const postsToInclude = manualPosts.filter((id) => id !== null).join(',');

      if (!postsToInclude) {
        return;
      }

      const result = await apiFetch<unknown>({
        path: addQueryArgs(
          '/wp/v2/posts',
          {
            offset: 0,
            orderby: 'include',
            per_page: postsToInclude.length,
            type: postTypeString,
            include: postsToInclude,
            status: includeFuturePosts ? ['publish', 'future'] : 'publish',
            _locale: 'user',
            context: 'edit',
          },
        ),
      });

      const resultIds = Array.isArray(result)
        ? result
          .map((post: unknown) => {
            if (post
              && typeof post === 'object'
              && 'id' in post
              && typeof post.id === 'number') {
              return post.id;
            }
            return 0;
          })
          .filter((id) => id !== 0)
        : [];
      setAttributes({ validPosts: resultIds });
    };

    updateValidPosts();
  }, [includeFuturePosts, isFirstPost, manualPosts, postTypeString, setAttributes]);

  /**
   * Check if deduplication is needed when validPosts are available.
   */
  useEffect(() => {
    if (!isFirstPost) {
      return;
    }

    if (validPosts.length > 0) {
      mainDedupe();
    }
  }, [isFirstPost, validPosts.length]);

  /**
   * Normalize manualPosts to ensure it has the correct length and no undefined values.
   */
  useEffect(() => {
    if (!isFirstPost) {
      return;
    }
    // Check if normalization is needed.
    const needsUpdate = manualPosts.length !== numberOfPosts
      || manualPosts.some((post) => post === undefined);

    if (needsUpdate) {
      // Create normalized array in one go.
      const normalizedPosts = Array(numberOfPosts)
        .fill(null)
        .map((_, i) => manualPosts[i] || null);

      setAttributes({ posts: normalizedPosts });
    }
  }, [isFirstPost, manualPosts, numberOfPosts, setAttributes]);

  const TEMPLATE: Template[] = [
    [
      'core/post-template',
      {},
      [
        [
          'wp-curate/post',
          {},
          [
            ['wp-curate/post-title', { isLink: true, level: 3 }],
          ],
        ],
      ],
    ],
  ];

  const displayTypes: Option[] = allowedPostTypes.map((type) => ({
    label: type.name,
    value: type.slug,
  }));
  const blockProps = useBlockProps();

  return (
    isFirstPost ? (
      <>
        <div {...blockProps}>
          {numberOfPosts > 0 ? (
            <InnerBlocks template={TEMPLATE} />
          ) : (
            <p className="zero-posts">{__('Subquery Block: Number of Posts is set to 0', 'wp-curate')}</p>
          )}
        </div>
        <QueryControls
          allowedTaxonomies={allowedTaxonomies}
          deduplication={deduplication}
          displayTypes={displayTypes}
          isPostDeduplicating={isPostDeduplicating}
          manualPosts={manualPosts}
          maxPosts={maxPosts}
          maxNumberOfPosts={maxNumberOfPosts}
          minNumberOfPosts={minNumberOfPosts}
          numberOfPosts={numberOfPosts}
          offset={offset}
          orderby={orderby}
          order={order}
          metaKey={metaKey}
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
    ) : null
  );
}
