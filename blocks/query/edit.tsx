/* eslint-disable camelcase */
import useSWRImmutable from 'swr/immutable';
import { PostPicker, TermSelector, Checkboxes } from '@alleyinteractive/block-editor-tools';
import classnames from 'classnames';
import { useDebounce } from '@uidotdev/usehooks';
import apiFetch from '@wordpress/api-fetch';
import { InnerBlocks, InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
  PanelBody,
  PanelRow,
  RadioControl,
  RangeControl,
  SelectControl,
  TextControl,
  ToggleControl,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import {
  Fragment,
  createInterpolateElement,
  useEffect,
  useState,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';

import { Template } from '@wordpress/blocks';
import type { WP_REST_API_Posts as WpRestApiPosts } from 'wp-types'; // eslint-disable-line camelcase

import type {
  EditProps,
  Option,
  Taxonomies,
  Term,
  Types,
} from './types';

import { mainDedupe } from '../../services/deduplicate';
import buildPostsApiPath from '../../services/buildPostsApiPath';
import buildTermQueryArgs from '../../services/buildTermQueryArgs';
import queryBlockPostFetcher from '../../services/queryBlockPostFetcher';

import './index.scss';

interface Window {
  wpCurateQueryBlock: {
    allowedPostTypes: Array<string>;
    allowedTaxonomies: Array<string>;
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
    maxNumberOfPosts: maxNumberOfPostsAttr,
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
    setAttributes({ postTypes: allowedPostTypes });
  }

  const maxNumberOfPosts = !maxNumberOfPostsAttr
    || maxNumberOfPostsAttr > maxPosts ? maxPosts : maxNumberOfPostsAttr;

  const andOrOptions = [
    {
      label: __('AND', 'wp-curate'),
      value: 'AND',
    },
    {
      label: __('OR', 'wp-curate'),
      value: 'OR',
    },
  ];

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
  const [availableTaxonomies, setAvailableTaxonomies] = useState<Taxonomies>({});
  const [availableTypes, setAvailableTypes] = useState<Types>({});

  const taxCount = allowedTaxonomies.filter((taxonomy: string) => terms[taxonomy]?.length > 0).length; // eslint-disable-line max-len

  const termQueryArgs = buildTermQueryArgs(
    allowedTaxonomies,
    terms,
    availableTaxonomies,
    termRelations,
    taxRelation,
  );

  const manualPostIds = manualPosts.map((post) => (post ?? null)).join(',');
  const currentPostId = Number(useSelect((select: any) => select('core/editor').getCurrentPostId(), []));
  const postTypeString = postTypes.join(',');

  // Construct the API path using query args.
  const path = Object.keys(availableTaxonomies).length > 0
    ? `${buildPostsApiPath({
      search: debouncedSearchTerm,
      offset,
      postType: postTypeString,
      status: 'publish',
      perPage: 20,
      orderBy: orderby,
      currentPostId,
    })}&${termQueryArgs}`
    : undefined;

  // Use SWR to fetch data.
  const { data, error } = useSWRImmutable(
    [path, currentPostId],
    queryBlockPostFetcher,
  );

  // Fetch available taxonomies.
  useEffect(() => {
    const fetchTaxonomies = async () => {
      apiFetch({ path: '/wp/v2/taxonomies' }).then((response) => {
        setAvailableTaxonomies(response as Taxonomies);
      });
    };
    fetchTaxonomies();
  }, []);

  // Fetch available post types.
  useEffect(() => {
    const fetchTypes = async () => {
      apiFetch({ path: '/wp/v2/types' }).then((response) => {
        setAvailableTypes(response as Types);
      });
    };
    fetchTypes();
  }, []);

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
      mainDedupe();
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

  const setManualPost = (id: number, index: number) => {
    const newManualPosts = [...manualPosts];
    // If the post is already in the list, remove it.
    if (id !== null && newManualPosts.includes(id)) {
      newManualPosts.splice(newManualPosts.indexOf(id), 1, null);
    }
    newManualPosts.splice(index, 1, id);
    setAttributes({ posts: newManualPosts });
  };

  const setTerms = ((type: string, newTerms: Term[]) => {
    const cleanedTerms = newTerms.map((term) => (
      {
        id: term.id,
        title: term.title,
        url: term.url,
        type: term.type,
      }
    ));
    const newTermAttrs = {
      ...terms,
      [type]: cleanedTerms,
    };
    setAttributes({ terms: newTermAttrs });
  });

  const setTermRelation = ((type: string, relation: string) => {
    const newTermRelationAttrs = {
      ...termRelations,
      [type]: relation,
    };
    setAttributes({ termRelations: newTermRelationAttrs });
  });

  const setNumberOfPosts = (newValue?: number) => {
    setAttributes({
      numberOfPosts: newValue,
      posts: manualPosts.slice(0, newValue),
    });
  };

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

  const displayTypes: Option[] = [];
  Object.keys(availableTypes).forEach((type) => {
    if (allowedPostTypes.includes(type)) {
      displayTypes.push(
        {
          label: availableTypes[type].name,
          value: type,
        },
      );
    }
  });

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

      <InspectorControls>
        <PanelBody
          title={__('Setup', 'wp-curate')}
          initialOpen
        >
          {minNumberOfPosts !== undefined && minNumberOfPosts !== maxNumberOfPosts ? (
            <RangeControl
              label={__('Number of Posts', 'wp-curate')}
              help={__('The maximum number of posts to show.', 'wp-curate')}
              value={numberOfPosts}
              onChange={setNumberOfPosts}
              min={minNumberOfPosts}
              max={maxNumberOfPosts}
            />
          ) : null}
          <RangeControl
            label={__('Offset', 'wp-curate')}
            help={__('The number of posts to pass over.', 'wp-curate')}
            onChange={(newValue) => setAttributes({ offset: newValue })}
            value={offset}
            min={0}
            max={20}
          />
        </PanelBody>

        <PanelBody
          title={__('Select Posts', 'wp-curate')}
          initialOpen={false}
          className="manual-posts"
        >
          {manualPosts.map((_post, index) => (
            <PanelRow
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              className={classnames(
                'manual-posts__container',
                { 'manual-posts__container--selected': manualPosts[index] },
              )}
            >
              <span className="manual-posts__counter">{index + 1}</span>
              <PostPicker
                allowedTypes={allowedPostTypes}
                onReset={() => setManualPost(0, index)}
                onUpdate={(id: number) => { setManualPost(id, index); }}
                value={manualPosts[index] || 0}
                className="manual-posts__picker"
              />
            </PanelRow>
          ))}
        </PanelBody>

        <PanelBody
          title={__('Query Parameters', 'wp-curate')}
          initialOpen={false}
        >
          <Checkboxes
            label={__('Post Types', 'wp-curate')}
            value={postTypes}
            onChange={(newValue) => setAttributes({ postTypes: newValue })}
            options={displayTypes}
          />
          {Object.keys(availableTaxonomies).length > 0 ? (
            allowedTaxonomies.map((taxonomy) => (
              <Fragment key={taxonomy}>
                { /* @ts-ignore */ }
                <TermSelector
                  label={availableTaxonomies[taxonomy].name || taxonomy}
                  subTypes={[taxonomy]}
                  selected={terms[taxonomy] ?? []}
                  onSelect={(newCategories: Term[]) => setTerms(taxonomy, newCategories)}
                  multiple
                />
                {terms[taxonomy]?.length > 1 ? (
                  <SelectControl
                    label={sprintf(
                      __('%s Relation', 'wp-curate'),
                      availableTaxonomies[taxonomy].name || taxonomy,
                    )}
                    help={__('AND: Posts must have all selected terms. OR: Posts may have one or more selected terms.', 'wp-curate')}
                    options={andOrOptions}
                    onChange={(newValue) => setTermRelation(taxonomy, newValue)}
                    value={termRelations[taxonomy] ?? 'OR'}
                  />
                ) : null}
                <hr />
              </Fragment>
            ))
          ) : null}
          {taxCount > 1 ? (
            <SelectControl
              label={__('Taxonomy Relation', 'wp-curate')}
              help={__('AND: Posts must meet all selected taxonomy requirements. OR: Posts may have meet one or more selected taxonomy requirements.', 'wp-curate')}
              options={andOrOptions}
              onChange={(newValue) => setAttributes({ taxRelation: newValue })}
              value={taxRelation}
            />
          ) : null }
          <TextControl
            label={__('Search Term', 'wp-curate')}
            onChange={(next) => setAttributes({ searchTerm: next })}
            value={searchTerm}
          />
          { parselyAvailable === 'true' ? (
            <ToggleControl
              label={__('Show Trending Content from Parsely', 'wp-curate')}
              help={__('If enabled, the block will show trending content from Parsely.', 'wp-curate')}
              checked={orderby === 'trending'}
              onChange={(next) => setAttributes({ orderby: next ? 'trending' : 'date' })}
            />
          ) : null }
        </PanelBody>
      </InspectorControls>

      { /* @ts-ignore */ }
      <InspectorControls group="advanced">
        <RadioControl
          label={__('Deduplication', 'wp-curate')}
          help={__('Customize whether posts that have already appeared in previous query blocks can appear again in this block.', 'wp-curate')}
          options={[
            {
              // @ts-ignore
              label: createInterpolateElement(
                sprintf(
                  __('Inherit deduplication setting from this %1$s (currently %2$s)', 'wp-curate'),
                  postTypeObject ? postTypeObject.labels.singular_name : 'post',
                  `<strong>${isPostDeduplicating ? __('enabled', 'wp-curate') : __('disabled', 'wp-curate')}</strong>`,
                ),
                {
                  strong: <strong />,
                },
              ),
              value: 'inherit',
            },
            {
              label: __('Never exclude posts appearing in previous query blocks', 'wp-curate'),
              value: 'never',
            },
          ]}
          onChange={(next) => setAttributes({ deduplication: next })}
          selected={deduplication as string}
        />
      </InspectorControls>
    </>
  );
}
