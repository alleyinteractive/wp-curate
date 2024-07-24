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

type PostTypeOrTerm = {
  name: string;
  slug: string;
};

type QueryControlsProps = {
  allowedPostTypes: PostTypeOrTerm[];
  allowedTaxonomies: PostTypeOrTerm[];
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
  taxCount: number;
  taxRelation: string;
  termRelations: Record<string, string>;
  terms: Record<string, Term[]>;
};

export default function QueryControls({
  allowedPostTypes,
  allowedTaxonomies = [],
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
  taxCount,
  taxRelation,
  termRelations,
  terms,
}: QueryControlsProps) {
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

  const setManualPost = (id: number, index: number) => {
    const newManualPosts = [...manualPosts];
    // If the post is already in the list, remove it.
    if (id !== null && newManualPosts.includes(id)) {
      newManualPosts.splice(newManualPosts.indexOf(id), 1, null);
    }
    newManualPosts.splice(index, 1, id);
    setAttributes({ posts: newManualPosts });
  };

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
                allowedTypes={allowedPostTypes.map((type) => type.slug)}
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
          {allowedTaxonomies.map((taxonomy) => (
            <Fragment key={taxonomy.slug}>
              { /* @ts-ignore */ }
              <TermSelector
                label={taxonomy.name}
                subTypes={[taxonomy]}
                selected={terms[taxonomy.slug] ?? []}
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
                  onChange={(newValue) => setTermRelation(taxonomy.slug, newValue)}
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
