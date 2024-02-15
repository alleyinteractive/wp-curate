/* eslint-disable camelcase */
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

import type { WP_REST_API_Post, WP_REST_API_Posts } from 'wp-types';
import { Template } from '@wordpress/blocks';
import type {
  EditProps,
  Option,
  Taxonomies,
  Term,
  Types,
} from './types';

import {
  mainDedupe,
} from '../../services/deduplicate';

import buildTermQueryArgs from '../../services/buildTermQueryArgs';

import './index.scss';

interface Window {
  wpCurateQueryBlock: {
    allowedPostTypes: Array<string>;
    allowedTaxonomies: Array<string>;
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
    postTypes = ['post'],
    searchTerm = '',
    terms = {},
    termRelations = {},
    taxRelation = 'AND',
  },
  setAttributes,
}: EditProps) {
  const {
    wpCurateQueryBlock: {
      allowedPostTypes = [],
      allowedTaxonomies = [],
    } = {},
  } = (window as any as Window);

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
  const [isPostDeduplicating, postTypeObject] = useSelect(
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
  const postTypeString = postTypes.join(',');

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

  // Fetch "backfill" posts when categories, tags, or search term change.
  useEffect(() => {
    if (Object.keys(availableTaxonomies).length <= 0) {
      return;
    }
    const fetchPosts = async () => {
      let path = addQueryArgs(
        '/wp/v2/posts',
        {
          search: debouncedSearchTerm,
          offset,
          type: postTypeString,
          status: 'publish',
          per_page: 20,
        },
      );
      path += `&${termQueryArgs}`;

      apiFetch({
        path,
      }).then((response) => {
        const postIds: number[] = (response as WP_REST_API_Posts).map(
          (post: WP_REST_API_Post) => post.id,
        );
        setAttributes({ backfillPosts: postIds });
      });
    };
    fetchPosts();
  }, [
    debouncedSearchTerm,
    termQueryArgs,
    offset,
    postTypeString,
    availableTaxonomies,
    setAttributes,
  ]);

  // Update the query when the backfillPosts change.
  // The query is passed via context to the core/post-template block.
  useEffect(() => {
    mainDedupe();
  }, [
    manualPostIds,
    backfillPosts,
    numberOfPosts,
    setAttributes,
    postTypeString,
    isPostDeduplicating,
    deduplication,
  ]);

  const setManualPost = (id: number, index: number) => {
    const newManualPosts = [...manualPosts];
    // If the post is already in the list, remove it.
    if (newManualPosts.includes(id)) {
      const existing = newManualPosts.indexOf(id);
      newManualPosts.splice(existing, 1, null);
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
            ['core/post-title', { isLink: true }],
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
      <div {...useBlockProps()}>
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
