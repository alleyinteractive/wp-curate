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
  setPostTypes: (value: any) => void;
  setTerms: (value: any) => void;
  terms: Record<string, Term[]>;
};

export default function SearchFilters({
  allowedTaxonomies = [],
  displayTypes,
  postTypes,
  setPostTypes,
  setTerms,
  terms,
}: SearchFiltersProps) {
  const updateTerms = ((type: string, newTerms: Term[]) => {
    const newTermAttrs = {
      ...terms,
      [type]: newTerms,
    };
    setTerms(newTermAttrs);
  });

  return (
    <HStack alignment="start" justify="left" spacing={4}>
      <div key="post-types">
        <Checkboxes
          label={__('Post Types', 'wp-curate')}
          value={postTypes.length ? postTypes : displayTypes.map((type) => type.value)}
          onChange={setPostTypes}
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
            onSelect={(newCategories: Term[]) => updateTerms(taxonomy.slug, newCategories)}
            multiple
          />
        </Fragment>
      ))}
    </HStack>
  );
}
