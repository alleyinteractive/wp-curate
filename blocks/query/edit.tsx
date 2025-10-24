/* eslint-disable camelcase */
import { useEffect, useState } from 'react';
import useSWRImmutable from 'swr/immutable';
import classnames from 'classnames';
import { useDebounce } from '@uidotdev/usehooks';
import { InnerBlocks, useBlockProps, store as blockEditorStore } from '@wordpress/block-editor';
import { useSelect, dispatch } from '@wordpress/data';
import { addQueryArgs } from '@wordpress/url';

import type { WP_REST_API_Posts as WpRestApiPosts } from 'wp-types'; // eslint-disable-line camelcase
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';

import type {
  EditProps,
  Option,
} from './types';
import type { Block } from '../../types/block';

import { mainDedupe } from '../../services/deduplicate';
import buildPostsApiPath from '../../services/buildPostsApiPath';
import buildTermQueryArgs from '../../services/buildTermQueryArgs';
import queryBlockPostFetcher from '../../services/queryBlockPostFetcher';
import recursivelyFindBlocksByName from '../../services/recursivelyFindBlocksByName';

import QueryControls from '../../components/QueryControls';
import QueryPlaceholder from '../../components/QueryPlaceholder';
import PatternSelectionModal from '../../components/PatternSelectionModal';
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
    maxPosts: string,
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
  attributes,
  attributes: {
    backfillPosts = [],
    deduplication = 'inherit',
    maxNumberOfPosts = 10,
    minNumberOfPosts = 1,
    numberOfPosts: attributeNumberOfPosts = 5,
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
    moveData = {},
    supportsPostTypes = [],
  },
  clientId,
  setAttributes,
}: EditProps) {
  const [isPatternSelectionModalOpen, setIsPatternSelectionModalOpen] = useState(false);
  const {
    wpCurateQueryBlock: {
      allowedPostTypes = [],
      allowedTaxonomies = [],
      parselyAvailable = 'false',
      maxPosts = '10',
    } = {},
  } = (window as any as Window);

  if (!postTypes.length) {
    setAttributes({ postTypes: allowedPostTypes.map((type) => type.slug) });
  }

  const thisBlock = useSelect(
    // @ts-expect-error
    (select) => select(blockEditorStore).getBlocksByClientId(clientId)[0],
    [clientId],
  );
  const hasInnerBlocks = thisBlock ? thisBlock.innerBlocks.length > 0 : false;

  const blocks = useSelect(
    (select) => select(blockEditorStore).getBlocks(),
    [],
  );

  const postBlocks: Block[] = [];
  recursivelyFindBlocksByName(thisBlock, ['wp-curate/post', 'core/post-template'], postBlocks);
  const hasTemplateBlock = postBlocks.some((block) => block.name === 'core/post-template');
  const postBlockCount = postBlocks.filter((block) => block.name === 'wp-curate/post').length;

  const numberOfPosts = hasTemplateBlock
    ? attributeNumberOfPosts
    : postBlockCount;

  // @ts-ignore
  const [
    isPostDeduplicating,
    postTypeObject,
    uniquePinnedPosts,
    getBlockIndexFunction,
  ] = useSelect(
    (select) => {
      // @ts-ignore
      const editor = select('core/editor');

      // @ts-ignore
      const type = editor.getEditedPostAttribute('type');
      // @ts-ignore
      const meta = editor.getEditedPostAttribute('meta');

      const blockEditor = select('core/block-editor');
      const { getBlockIndex } = blockEditor;

      return [
        // It's possible for usePostMetaValue() to run here before useEntityProp() is available.
        Boolean(meta?.wp_curate_deduplication),
        // @ts-ignore
        type ? select('core').getPostType(type) : null,
        Boolean(meta?.wp_curate_unique_pinned_posts),
        getBlockIndex,
      ];
    },
    [],
  );
  const blockIndex = getBlockIndexFunction(clientId);

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
    order,
    metaKey,
    currentPostId,
  })}&${termQueryArgs}`;

  // Use SWR to fetch data.
  const { data, error } = useSWRImmutable(
    [path, currentPostId],
    queryBlockPostFetcher,
  );

  // Set a default query attribute. This allows previews to work.
  useEffect(() => {
    if (!attributes.query) {
      setAttributes({
        query: {
          perPage: numberOfPosts,
          postType: 'post',
        },
        queryId: 0,
      });
    }
  }, [attributes.query, numberOfPosts, setAttributes]);

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
      mainDedupe(blocks, dispatch(blockEditorStore));
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
    blockIndex,
    postBlockCount,
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
              type: postTypeString,
              include: postsToInclude,
              _locale: 'user',
              context: 'edit',
            },
          ),
        }).then((response) => (response as any as WpRestApiPosts).map((post) => post.id));
      }

      setAttributes({ validPosts });
      mainDedupe(blocks, dispatch(blockEditorStore));
    };
    updateValidPosts();
  }, [manualPosts, setAttributes, postTypeString]);

  // When numberOfPosts changes, update manualPosts array.
  useEffect(() => {
    if (manualPosts.length !== numberOfPosts) {
      const normalizedPosts = Array(numberOfPosts)
        .fill(null)
        .map((_, i) => manualPosts[i] || null);

      setAttributes({ posts: normalizedPosts });
    }
  }, [numberOfPosts]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (attributeNumberOfPosts !== numberOfPosts && numberOfPosts !== 0) {
      setAttributes({ numberOfPosts });
    }
  }, [numberOfPosts, attributeNumberOfPosts, setAttributes]);

  const displayTypes: Option[] = allowedPostTypes
    .map((type) => ({
      label: type.name,
      value: type.slug,
    }))
    .filter((type) => {
      // Inherits globally supported post types if attribute is empty.
      if (!supportsPostTypes.length) {
        return true;
      }

      // Display only supported post types defined by block.
      return supportsPostTypes.includes(type.value);
    });

  const Content = hasInnerBlocks ? (
    <InnerBlocks />
  ) : (
    <QueryPlaceholder
      name="wp-curate/query"
      clientId={clientId}
      attributes={attributes}
      openPatternSelectionModal={() => setIsPatternSelectionModalOpen(true)}
    />
  );

  return (
    <>
      <div {...useBlockProps({
        className: classnames(
          { 'wp-curate-query-block--move': moveData.postId },
        ),
      })}
      >
        { isPatternSelectionModalOpen ? (
          <PatternSelectionModal
            clientId={clientId}
            attributes={attributes}
            setIsPatternSelectionModalOpen={setIsPatternSelectionModalOpen}
          />
        ) : null}
        {
          error ? (
            <p>{__('No results found.', 'wp-curate')}</p>
          ) : (
            Content
          )
        }
      </div>
      <QueryControls
        allowedTaxonomies={allowedTaxonomies}
        deduplication={deduplication}
        displayTypes={displayTypes}
        hasNonTemplatePostBlocks={postBlockCount > 0}
        hasTemplateBlock={hasTemplateBlock}
        isPostDeduplicating={isPostDeduplicating}
        manualPosts={manualPosts}
        maxPosts={parseInt(maxPosts, 10)}
        maxNumberOfPosts={maxNumberOfPosts}
        minNumberOfPosts={Math.max(minNumberOfPosts, postBlockCount)}
        numberOfPosts={numberOfPosts}
        offset={offset}
        order={order}
        orderby={orderby}
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
  );
}
