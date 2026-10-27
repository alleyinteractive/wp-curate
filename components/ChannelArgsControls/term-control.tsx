// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { BaseControl, Button } from '@wordpress/components';
import { useInstanceId } from '@wordpress/compose';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';

// Plugin dependencies.
import TermPicker from '../TermPicker';

interface TermControlProps {
  label: string;
  onChange: (term: number) => void;
  taxonomy: string;
  value: unknown;
}

/**
 * Reads the name of a term record, or an empty string if it has none.
 *
 * @param term Term record from core-data.
 */
function toTermName(term: unknown): string {
  let name = '';

  if (typeof term !== 'object' || term === null) {
    return name;
  }

  const {
    name: termName,
  } = term as Record<string, unknown>;

  // The REST API gives the name with HTML entities, such as `&amp;`.
  if (typeof termName === 'string') {
    name = decodeEntities(termName);
  }

  return name;
}

/**
 * The control of a `term` argument: the selected term, with a button that opens the term picker.
 */
export default function TermControl({
  label,
  onChange,
  taxonomy,
  value,
}: TermControlProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const id = useInstanceId(TermControl, 'wp-curate-channel-term-control');

  let termId = 0;

  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    termId = value;
  }

  const termName: string = useSelect((select) => {
    const {
      getEntityRecord,
    } = select(coreStore) as any;

    let name = '';

    // An author can read terms in the `view` context, but not in the `edit` context.
    if (termId > 0) {
      name = toTermName(getEntityRecord('taxonomy', taxonomy, termId, { context: 'view' }));
    }

    return name;
  }, [taxonomy, termId]);

  let help = '';
  let selected: string = __('None selected', 'wp-curate');

  if (termId === 0) {
    help = __('The channel shows no posts until a term is selected.', 'wp-curate');
  }

  // The name is empty while the term loads.
  if (termId > 0) {
    selected = termName;
  }

  return (
    <>
      <BaseControl
        __nextHasNoMarginBottom
        help={help}
        id={id}
        label={label}
      >
        <p>{selected}</p>
        <div>
          <Button
            id={id}
            onClick={() => setIsPickerOpen(true)}
            variant="secondary"
          >
            {termId > 0 ? __('Replace', 'wp-curate') : __('Select', 'wp-curate')}
          </Button>
        </div>
      </BaseControl>

      {isPickerOpen ? (
        <TermPicker
          taxonomy={taxonomy}
          selectedId={termId}
          onClose={() => setIsPickerOpen(false)}
          onSelect={(term) => {
            onChange(term);
            setIsPickerOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
