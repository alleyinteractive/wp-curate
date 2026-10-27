// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { Modal } from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { DataViewsPicker } from '@wordpress/dataviews';
import { useMemo, useState } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';

interface TermPickerProps {
  taxonomy: string;
  selectedId: number;
  onClose: () => void;
  onSelect: (id: number) => void;
}

interface PickerItem {
  count: number;
  id: number;
  name: string;
}

/*
 * The term name and the number of posts in the term. The REST API sorts the terms by either one,
 * so each field ID is also the `orderby` value of its sort.
 */
const FIELDS = [
  {
    enableHiding: false,
    enableSorting: true,
    getValue: ({ item }: { item: PickerItem }) => item.name,
    id: 'name',
    label: __('Name', 'wp-curate'),
  },
  {
    enableHiding: false,
    enableSorting: true,
    getValue: ({ item }: { item: PickerItem }) => item.count,
    id: 'count',
    label: __('Count', 'wp-curate'),
    type: 'integer' as const,
  },
];

const SORT_FIELDS = ['count', 'name'];

/**
 * Reads a term record from the REST API, or null if it does not have the shape of one.
 *
 * @param term Term record from core-data.
 */
function toPickerItem(term: unknown): PickerItem | null {
  let item: PickerItem | null = null;

  if (typeof term !== 'object' || term === null) {
    return item;
  }

  const {
    count,
    id,
    name,
  } = term as Record<string, unknown>;

  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
    return item;
  }

  item = {
    count: 0,
    id,
    name: __('(no name)', 'wp-curate'),
  };

  if (typeof count === 'number' && Number.isInteger(count)) {
    item.count = count;
  }

  // The REST API gives the name with HTML entities, such as `&amp;`.
  if (typeof name === 'string' && name !== '') {
    item.name = decodeEntities(name);
  }

  return item;
}

/**
 * Reads a label of a taxonomy record, or an empty string if it has none.
 *
 * @param taxonomyObject Taxonomy record from core-data.
 * @param key            Label key, such as `name`.
 */
function toTaxonomyLabel(taxonomyObject: unknown, key: string): string {
  let label = '';

  if (typeof taxonomyObject !== 'object' || taxonomyObject === null) {
    return label;
  }

  const {
    labels,
  } = taxonomyObject as Record<string, unknown>;

  if (typeof labels !== 'object' || labels === null) {
    return label;
  }

  const {
    [key]: value,
  } = labels as Record<string, unknown>;

  if (typeof value === 'string') {
    label = value;
  }

  return label;
}

/**
 * Modal for picking one term of a taxonomy.
 *
 * The picker loads one page at a time, of the terms or of the terms that match a search.
 */
export default function TermPicker({
  taxonomy,
  selectedId,
  onClose,
  onSelect,
}: TermPickerProps) {
  const [selection, setSelection] = useState<string[]>(selectedId > 0 ? [String(selectedId)] : []);
  const [view, setView] = useState<any>({
    fields: ['count'],
    filters: [],
    page: 1,
    perPage: 10,
    search: '',
    sort: {
      direction: 'asc',
      field: 'name',
    },
    titleField: 'name',
    type: 'pickerTable',
  });

  // The REST API query for the current page.
  const query = useMemo(() => {
    const out: Record<string, unknown> = {
      // An author can read terms in the `view` context, but not in the `edit` context.
      context: 'view',
      order: 'asc',
      orderby: 'name',
      page: 1,
      per_page: 10,
    };

    if (Number.isInteger(view.page) && view.page > 0) {
      out.page = view.page;
    }

    if (Number.isInteger(view.perPage) && view.perPage > 0) {
      out.per_page = view.perPage;
    }

    if (typeof view.search === 'string' && view.search.trim() !== '') {
      out.search = view.search.trim();
    }

    if (view.sort && SORT_FIELDS.includes(view.sort.field)) {
      out.orderby = view.sort.field;
    }

    if (view.sort && view.sort.direction === 'desc') {
      out.order = 'desc';
    }

    return out;
  }, [view.page, view.perPage, view.search, view.sort]);

  const {
    taxonomyObject,
    terms,
    totalItems,
    totalPages,
  } = useSelect((select) => {
    const {
      getEntityRecords,
      getEntityRecordsTotalItems,
      getEntityRecordsTotalPages,
      getTaxonomy,
    } = select(coreStore) as any;

    return {
      taxonomyObject: getTaxonomy(taxonomy),
      terms: getEntityRecords('taxonomy', taxonomy, query),
      totalItems: getEntityRecordsTotalItems('taxonomy', taxonomy, query),
      totalPages: getEntityRecordsTotalPages('taxonomy', taxonomy, query),
    };
  }, [query, taxonomy]);

  // The totals of the last page that loaded, so that the pagination stays while the next one loads.
  const [paginationInfo, setPaginationInfo] = useState({ totalItems: 0, totalPages: 0 });

  if (
    Number.isInteger(totalItems)
    && Number.isInteger(totalPages)
    && (totalItems !== paginationInfo.totalItems || totalPages !== paginationInfo.totalPages)
  ) {
    setPaginationInfo({
      totalItems,
      totalPages,
    });
  }

  const data = useMemo(() => {
    const items: PickerItem[] = [];

    if (Array.isArray(terms)) {
      terms.forEach((term: unknown) => {
        const item = toPickerItem(term);

        if (item !== null) {
          items.push(item);
        }
      });
    }

    return items;
  }, [terms]);

  let title: string = __('Select a term', 'wp-curate');
  let searchLabel: string = __('Search terms', 'wp-curate');

  if (toTaxonomyLabel(taxonomyObject, 'name') !== '') {
    title = toTaxonomyLabel(taxonomyObject, 'name');
  }

  if (toTaxonomyLabel(taxonomyObject, 'search_items') !== '') {
    searchLabel = toTaxonomyLabel(taxonomyObject, 'search_items');
  }

  return (
    <Modal
      title={title}
      onRequestClose={onClose}
      size="large"
    >
      <DataViewsPicker
        actions={[
          {
            // Use the selection. The callback only gets the selected items on the current page.
            callback: () => {
              const id = Number(selection[0]);

              // The selected term can be on a page that the picker showed before.
              if (Number.isInteger(id) && id > 0) {
                onSelect(id);
              }
            },
            id: 'select',
            isPrimary: true,
            label: __('Select', 'wp-curate'),
            supportsBulk: false,
          },
        ]}
        data={data}
        defaultLayouts={{ pickerTable: {} }}
        fields={FIELDS}
        getItemId={(item: PickerItem) => String(item.id)}
        isLoading={terms === null}
        itemListLabel={title}
        onChangeSelection={setSelection}
        onChangeView={setView}
        paginationInfo={paginationInfo}
        searchLabel={searchLabel}
        selection={selection}
        view={view}
      />
    </Modal>
  );
}
