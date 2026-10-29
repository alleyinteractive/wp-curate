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

const NO_NAMES: Record<number, string> = {};

/**
 * Reads the term IDs in an argument: one ID, or a list of them.
 *
 * @param value The argument.
 */
function toTermIds(value: unknown): number[] {
  let values: unknown[] = [];

  if (Array.isArray(value)) {
    values = value;
  }

  if (typeof value === 'number') {
    values = [value];
  }

  return values.filter((id): id is number => (
    typeof id === 'number' && Number.isInteger(id) && id > 0
  ));
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
 * The control of a channel argument with one term or a list of terms: the selected terms, each with
 * a button that removes it, and a button that opens the term picker.
 */
export default function TermControl({
  help,
  label,
  multiple,
  onChange,
  taxonomy,
  value,
}: {
  help: string;
  label: string;
  multiple: boolean;
  onChange: (ids: number[]) => void;
  taxonomy: string;
  value: unknown;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const id = useInstanceId(TermControl, 'wp-curate-channel-term-control');
  const termIds = toTermIds(value);
  const idsKey = termIds.join(',');

  // The names of the selected terms, keyed by term ID. A term has no name while it loads.
  const termNames: Record<number, string> = useSelect((select) => {
    const {
      getEntityRecords,
    } = select(coreStore) as any;

    let names = NO_NAMES;

    // An author can read terms in the `view` context, but not in the `edit` context.
    if (idsKey !== '') {
      const terms = getEntityRecords('taxonomy', taxonomy, {
        context: 'view',
        include: idsKey,
        per_page: idsKey.split(',').length,
      });

      if (Array.isArray(terms)) {
        names = {};

        terms.forEach((term: unknown) => {
          if (typeof term !== 'object' || term === null) {
            return;
          }

          const {
            id: termId,
          } = term as Record<string, unknown>;

          if (typeof termId === 'number' && Number.isInteger(termId) && termId > 0) {
            names[termId] = toTermName(term);
          }
        });
      }
    }

    return names;
  }, [idsKey, taxonomy]);

  let buttonLabel: string = __('Select', 'wp-curate');

  if (termIds.length > 0) {
    buttonLabel = multiple ? __('Edit', 'wp-curate') : __('Replace', 'wp-curate');
  }

  return (
    <>
      <BaseControl
        __nextHasNoMarginBottom
        help={help}
        id={id}
        label={label}
      >
        {termIds.length === 0 ? <p>{__('None selected', 'wp-curate')}</p> : null}

        {/* Each selected term, with a button that removes it. The picker cannot save no terms. */}
        {termIds.length > 0 ? (
          <ul>
            {termIds.map((termId) => {
              let name = String(termId);

              if (termId in termNames) {
                name = termNames[termId];
              }

              return (
                <li
                  key={termId}
                  style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}
                >
                  {name}
                  <Button
                    isDestructive
                    onClick={() => onChange(termIds.filter((other) => other !== termId))}
                    variant="link"
                  >
                    {__('Remove', 'wp-curate')}
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : null}

        <div>
          <Button
            id={id}
            onClick={() => setIsPickerOpen(true)}
            variant="secondary"
          >
            {buttonLabel}
          </Button>
        </div>
      </BaseControl>

      {isPickerOpen ? (
        <TermPicker
          multiple={multiple}
          onClose={() => setIsPickerOpen(false)}
          onSelect={(ids) => {
            onChange(ids);
            setIsPickerOpen(false);
          }}
          selectedIds={termIds}
          taxonomy={taxonomy}
        />
      ) : null}
    </>
  );
}
