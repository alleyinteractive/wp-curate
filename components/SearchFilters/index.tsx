import { Fragment } from 'react';
import { TermSelector, Checkboxes } from '@alleyinteractive/block-editor-tools';
import {
  __experimentalHStack as HStack,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

import type {
  Option,
  Term,
} from '../../blocks/query/types';

type PostTypeOrTerm = {
  name: string;
  slug: string;
};

type SearchFiltersProps = {
  allowedTaxonomies: PostTypeOrTerm[];
  displayTypes: Option[];
  postTypes: string[];
  setAttributes: (value: any) => void;
  terms: Record<string, Term[]>;
};

export default function SearchFilters({
  allowedTaxonomies = [],
  displayTypes,
  postTypes,
  setAttributes,
  terms,
}: SearchFiltersProps) {

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

  return (
    <HStack alignment="start" justify="left">
      <div key="post-types">
        <Checkboxes
          label={__('Post Types', 'wp-curate')}
          value={postTypes}
          onChange={(next) => setAttributes({ postTypes: next, backfillPosts: [] })}
          options={displayTypes}
        />
      </div>
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
        </Fragment>
      ))}
    </HStack>
  );
}
