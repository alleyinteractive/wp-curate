import { Fragment, useState } from 'react';
import classnames from 'classnames';

import { PostPicker, TermSelector, Checkboxes } from '@alleyinteractive/block-editor-tools';
import {
  PanelBody,
  PanelRow,
  RadioControl,
  RangeControl,
  SelectControl,
  TextControl,
  ToggleControl,
} from '@wordpress/components';
import { InspectorControls } from '@wordpress/block-editor';
import { createInterpolateElement } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { useDispatch } from '@wordpress/data';
import { store as noticesStore } from '@wordpress/notices';

import SearchFilters from '../SearchFilters';
import { postTypeWithFuture } from '../../services/utils';

import type {
  Option,
  Term,
} from '../../blocks/query/types';

type PostTypeOrTerm = {
  name: string;
  slug: string;
};

interface Window {
  wpCurateQueryBlock: {
    rawOrderByOptions: Record<string, string>;
    orderByMetaKeys: string[];
    includeFuturePosts: boolean;
  };
}

type QueryControlsProps = {
  allowedTaxonomies: PostTypeOrTerm[];
  deduplication: string;
  displayTypes: Option[];
  hasNonTemplatePostBlocks?: boolean;
  hasTemplateBlock?: boolean;
  isPostDeduplicating: boolean;
  manualPosts: Array<number | null>;
  maxPosts: number;
  maxNumberOfPosts: number;
  metaKey: string;
  minNumberOfPosts: number;
  numberOfPosts: number;
  offset: number;
  order: 'asc' | 'desc';
  orderby: string;
  parselyAvailable: string;
  postTypeObject: {
    labels: {
      singular_name: string;
    };
  };
  postTypes: string[];
  searchTerm: string;
  setAttributes: (value: any) => void;
  taxCount: number;
  taxRelation: string;
  termRelations: Record<string, string>;
  terms: Record<string, Term[]>;
};

export default function QueryControls({
  allowedTaxonomies = [],
  deduplication,
  displayTypes,
  hasNonTemplatePostBlocks = false,
  hasTemplateBlock = true,
  isPostDeduplicating,
  manualPosts,
  maxPosts,
  maxNumberOfPosts: maxNumberOfPostsAttr,
  metaKey,
  minNumberOfPosts,
  numberOfPosts,
  offset,
  order,
  orderby,
  parselyAvailable,
  postTypeObject,
  postTypes,
  searchTerm,
  setAttributes,
  taxCount,
  taxRelation,
  termRelations,
  terms,
}: QueryControlsProps) {
  const [filtered, setFiltered] = useState(true);

  const {
    wpCurateQueryBlock: {
      rawOrderByOptions = {
        title: __('Title', 'wp-curate'),
        date: __('Date', 'wp-curate'),
      },
      orderByMetaKeys = [],
      includeFuturePosts,
    } = {},
  } = (window as any as Window);

  const orderByOptions = [];
  for (const [key, label] of Object.entries(rawOrderByOptions)) {
    orderByOptions.push({ label, value: key });
  }

  const metaKeyOptions = [];
  if (orderByMetaKeys.length > 0) {
    metaKeyOptions.push(
      { label: __('Select', 'wp-curate'), value: '' },
    );
    orderByMetaKeys.forEach((key) => {
      metaKeyOptions.push(
        { label: key, value: key },
      );
    });
  }

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

  if (metaKeyOptions.length > 0) {
    orderByOptions.push(
      { label: __('Meta Value', 'wp-curate'), value: 'meta_value' },
    );
  }

  const maxNumberOfPosts = !maxNumberOfPostsAttr || maxNumberOfPostsAttr > maxPosts ? maxPosts : maxNumberOfPostsAttr; // eslint-disable-line max-len

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
    setAttributes({ terms: newTermAttrs, backfillPosts: [] });
  });

  const setTermRelation = ((type: string, relation: string) => {
    const newTermRelationAttrs = {
      ...termRelations,
      [type]: relation,
    };
    setAttributes({ termRelations: newTermRelationAttrs, backfillPosts: [] });
  });

  const setNumberOfPosts = (newValue?: number) => {
    setAttributes({
      numberOfPosts: (newValue && newValue > maxNumberOfPosts) ? maxNumberOfPosts : newValue,
      posts: manualPosts.slice(0, newValue),
    });
  };

  const setManualPost = (id: number, index: number) => {
    const newManualPosts = [...manualPosts];
    // If the post is already in the list, remove it.
    if (id !== null && newManualPosts.includes(id)) {
      newManualPosts.splice(newManualPosts.indexOf(id), 1, null);
    }
    newManualPosts.splice(index, 1, id);
    setAttributes({ posts: newManualPosts });
  };

  const maybeClearMetaKey = (orderBy: string) => {
    if (orderBy !== 'meta_value' && metaKey) {
      setAttributes({ metaKey: '' });
    }
  };

  // Get an object of taxonomies and termIds for filtering the
  // PostPicker as <Record<string, number[]>.
  const params: Record<string, number[]> = {};
  if (filtered) {
    Object.entries(terms).forEach(([taxonomy, termList]) => {
      if (termList.length) {
        params[taxonomy] = termList.map((term) => term.id);
      }
    });
  }
  const helpText = hasNonTemplatePostBlocks
    ? __('The maximum number of posts to show. Note: There are post blocks outside of a post template block that will also display posts, so the minimum number of posts cannot be below this number.', 'wp-curate') // eslint-disable-line max-len
    : __('The maximum number of posts to show.', 'wp-curate');

  const { createNotice } = useDispatch(noticesStore);

  const shouldShowFilter = displayTypes.length !== postTypes.length
    || Object.values(terms).some((termList) => Array.isArray(termList) && termList.length > 0);

  return (
    <>
      <InspectorControls>
        <PanelBody
          title={__('Setup', 'wp-curate')}
          initialOpen
        >
          {hasTemplateBlock
            && minNumberOfPosts !== undefined
            && minNumberOfPosts !== maxNumberOfPosts ? (
              <RangeControl
                label={__('Number of Posts', 'wp-curate')}
                help={helpText}
                value={numberOfPosts}
                onChange={setNumberOfPosts}
                min={minNumberOfPosts}
                max={maxNumberOfPosts}
              />
            ) : null}
          <RangeControl
            label={__('Offset', 'wp-curate')}
            help={__('The number of posts to pass over.', 'wp-curate')}
            onChange={(next) => setAttributes({ offset: next })}
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
                allowedTypes={filtered ? postTypes : displayTypes.map((type) => type.value)}
                onReset={() => setManualPost(0, index)}
                onUpdate={(id: number) => { setManualPost(id, index); }}
                value={manualPosts[index] || 0}
                className="manual-posts__picker"
                // @ts-ignore This function does work with this prop.
                getPostType={includeFuturePosts ? postTypeWithFuture : null}
                filters={(
                  <SearchFilters
                    shouldShowFilter={shouldShowFilter}
                    filtered={filtered}
                    setFiltered={setFiltered}
                  />
                )}
                params={{
                  ...params,
                  wp_curate_include_future: Number(includeFuturePosts),
                }}
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
            onChange={(next: string[]) => {
              // Prevent unchecking the last post type.
              if (next.length === 0) {
                createNotice(
                  'warning',
                  __('At least one post type must be selected.', 'wp-curate'),
                  {
                    type: 'snackbar',
                    isDismissible: true,
                  },
                );
                // Don't update attributes/return early if user is trying to deselect the last option.
                return;
              }
              setAttributes({ postTypes: next, backfillPosts: [] });
            }}
            options={displayTypes}
          />
          {allowedTaxonomies.map((taxonomy) => (
            <Fragment key={taxonomy.slug}>
              { /* TODO: Fix the @ts-ignore usage. */ }
              <TermSelector
                label={taxonomy.name}
                subTypes={[taxonomy.slug]}
                // @ts-ignore
                selected={terms[taxonomy.slug] ?? []}
                // @ts-ignore
                onSelect={(newCategories: Term[]) => setTerms(taxonomy.slug, newCategories)}
                multiple
              />
              {terms[taxonomy.slug]?.length > 1 ? (
                <SelectControl
                  label={sprintf(
                    __('%s Relation', 'wp-curate'),
                    taxonomy.name,
                  )}
                  help={__('AND: Posts must have all selected terms. OR: Posts may have one or more selected terms.', 'wp-curate')}
                  options={andOrOptions}
                  onChange={(next) => setTermRelation(taxonomy.slug, next)}
                  value={termRelations[taxonomy.slug] ?? 'OR'}
                />
              ) : null}
              <hr />
            </Fragment>
          ))}
          {taxCount > 1 ? (
            <SelectControl
              label={__('Taxonomy Relation', 'wp-curate')}
              help={__('AND: Posts must meet all selected taxonomy requirements. OR: Posts may have meet one or more selected taxonomy requirements.', 'wp-curate')}
              options={andOrOptions}
              onChange={(next) => setAttributes({ taxRelation: next, backfillPosts: [] })}
              value={taxRelation}
            />
          ) : null }
          <TextControl
            label={__('Search Term', 'wp-curate')}
            onChange={(next) => setAttributes({ searchTerm: next, backfillPosts: [] })}
            value={searchTerm}
          />
          <SelectControl
            label={__('Order By', 'wp-curate')}
            options={orderByOptions}
            onChange={(next) => {
              setAttributes({ orderby: next, backfillPosts: [] });
              maybeClearMetaKey(next);
            }}
            value={orderby}
          />
          {(orderby === 'meta_value') && metaKeyOptions.length > 0 ? (
            <SelectControl
              label={__('Meta Key', 'wp-curate')}
              options={metaKeyOptions}
              onChange={(next) => setAttributes({ metaKey: next, backfillPosts: [] })}
              value={metaKey}
            />
          ) : null}
          <SelectControl
            label={__('Order Direction', 'wp-curate')}
            help={__('Ascending means A-Z or 0-9 or oldest to newest. Descending means Z-A or 9-0 or newest to oldest.', 'wp-curate')}
            options={[
              { label: __('Ascending', 'wp-curate'), value: 'asc' },
              { label: __('Descending', 'wp-curate'), value: 'desc' },
            ]}
            onChange={(next) => setAttributes({ order: next, backfillPosts: [] })}
            value={order}
          />
          { parselyAvailable === 'true' ? (
            <ToggleControl
              label={__('Show Trending Content from Parsely', 'wp-curate')}
              help={__('If enabled, the block will show trending content from Parsely.', 'wp-curate')}
              checked={orderby === 'trending'}
              onChange={(next) => setAttributes({ orderby: next ? 'trending' : 'date', backfillPosts: [] })}
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
