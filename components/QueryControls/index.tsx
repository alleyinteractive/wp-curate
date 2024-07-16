import { PostPicker, TermSelector, Checkboxes } from '@alleyinteractive/block-editor-tools';
import classnames from 'classnames';
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
import {
  Fragment,
  createInterpolateElement,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

import type {
  Option,
  Term,
} from '../../blocks/query/types';

type QueryControlsProps = {
  allowedPostTypes: string[];
  allowedTaxonomies: string[];
  andOrOptions: Option[];
  availableTaxonomies: Record<string, { name: string }>;
  deduplication: string;
  displayTypes: Option[];
  isPostDeduplicating: boolean;
  manualPosts: number[];
  maxNumberOfPosts: number;
  minNumberOfPosts: number;
  numberOfPosts: number;
  offset: number;
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
  setManualPost: (id: number, index: number) => void;
  setNumberOfPosts: (value?: number) => void;
  setTermRelation: (taxonomy: string, relation: string) => void;
  setTerms: (taxonomy: string, terms: Term[]) => void;
  taxCount: number;
  taxRelation: string;
  termRelations: Record<string, string>;
  terms: Record<string, Term[]>;
};

export default function QueryControls({
  allowedPostTypes,
  allowedTaxonomies = [],
  andOrOptions,
  availableTaxonomies,
  deduplication,
  displayTypes,
  isPostDeduplicating,
  manualPosts,
  maxNumberOfPosts,
  minNumberOfPosts,
  numberOfPosts,
  offset,
  orderby,
  parselyAvailable,
  postTypeObject,
  postTypes,
  searchTerm,
  setAttributes,
  setManualPost,
  setNumberOfPosts,
  setTermRelation,
  setTerms,
  taxCount,
  taxRelation,
  termRelations,
  terms,
}: QueryControlsProps) {
  return (
    <>
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
};
