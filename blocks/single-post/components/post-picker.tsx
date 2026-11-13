// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { getMediaUrl } from '@alleyinteractive/block-editor-tools';
import { Modal } from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { DataViewsPicker } from '@wordpress/dataviews';
import { dateI18n, getSettings as getDateSettings } from '@wordpress/date';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// Plugin dependencies.
import { channelContext } from '../../../hooks/useBlockChannel';
import { channelQueueContext } from '../../../hooks/useChannelQueue';
import useChannelResults, { CHANNEL_PAGE_SIZE, type ChannelResultsPage } from '../../../hooks/useChannelResults';

interface PickerItem {
  /** Publish date in the site's time zone, or an empty string. */
  date: string;
  id: number;
  imageUrl: string;
  /** Singular name of the post type, such as "Post". */
  postType: string;
  /** Post status, such as `publish` or `future`. */
  status: string;
  title: string;
}

const PUBLISHED: string[] = ['publish'];

const SCHEDULED: string[] = ['future'];

const PUBLISHED_AND_SCHEDULED: string[] = ['publish', 'future'];

const FIELDS = [
  {
    enableHiding: false,
    enableSorting: false,
    id: 'media',
    label: __('Featured image', 'wp-curate'),
    render: ({
      item,
    }: { item: PickerItem }) => (item.imageUrl !== '' ? <img src={item.imageUrl} alt="" /> : null),
    type: 'media' as const,
  },
  {
    enableHiding: false,
    enableSorting: false,
    getValue: ({
      item,
    }: { item: PickerItem }) => item.title,
    id: 'title',
    label: __('Title', 'wp-curate'),
  },
  {
    enableHiding: false,
    enableSorting: false,
    getValue: ({
      item,
    }: { item: PickerItem }) => item.postType,
    id: 'postType',
    label: __('Post type', 'wp-curate'),
  },
  {
    enableHiding: false,
    enableSorting: false,
    getValue: ({
      item,
    }: { item: PickerItem }) => item.date,
    id: 'date',
    label: __('Date', 'wp-curate'),
    render: ({
      item,
    }: { item: PickerItem }) => (item.date !== '' ? dateI18n(getDateSettings().formats.datetime, item.date, undefined) : ''),
  },
];

/**
 * The status field. When the site lets the picker include scheduled posts, the field is also a
 * filter.
 *
 * @param canFilter Whether the field is a filter.
 */
function toStatusField(canFilter: boolean) {
  const elements = [
    { label: __('Published', 'wp-curate'), value: 'publish' },
    { label: __('Scheduled', 'wp-curate'), value: 'future' },
  ];

  return {
    elements,
    enableHiding: false,
    enableSorting: false,
    filterBy: canFilter ? {
      isPrimary: true,
      operators: ['isAny' as const],
    } : false as const,
    getValue: ({
      item,
    }: { item: PickerItem }) => item.status,
    id: 'status',
    label: __('Status', 'wp-curate'),
    render: ({
      item,
    }: { item: PickerItem }) => {
      const element = elements.find(({ value }) => value === item.status);

      let out = item.status;

      if (element !== undefined) {
        out = element.label;
      }

      return out;
    },
  };
}

/**
 * The post statuses that a view's status filter asks for. Without a filter, or with no statuses
 * in it, the picker shows every status that it can.
 *
 * @param view      DataViews view.
 * @param canFilter Whether the picker can include scheduled posts.
 */
function toPostStatuses(view: any, canFilter: boolean): string[] {
  let out = PUBLISHED;

  if (!canFilter) {
    return out;
  }

  out = PUBLISHED_AND_SCHEDULED;

  if (!Array.isArray(view.filters)) {
    return out;
  }

  const statusFilter = view.filters.find((filter: any) => filter.field === 'status');

  if (statusFilter === undefined || !Array.isArray(statusFilter.value)) {
    return out;
  }

  const hasPublished = statusFilter.value.includes('publish');
  const hasScheduled = statusFilter.value.includes('future');

  // The same arrays each time, so that requests for the same statuses match.
  if (hasPublished && !hasScheduled) {
    out = PUBLISHED;
  } else if (hasScheduled && !hasPublished) {
    out = SCHEDULED;
  }

  return out;
}

/**
 * Reads a string property of a post record, or an empty string if it has none.
 *
 * @param post Post record from core-data.
 * @param key  Property name.
 */
function toPostString(post: unknown, key: string): string {
  let out = '';

  if (typeof post !== 'object' || post === null) {
    return out;
  }

  const value = (post as Record<string, unknown>)[key];

  if (typeof value === 'string') {
    out = value;
  }

  return out;
}

/*
 * The view sorts by this ID, which no field has, because the channel sets the order. DataViews
 * disables the items per page control in a view without a sort field.
 */
const CHANNEL_ORDER = 'channelOrder';

/**
 * Reads the featured image ID of a post record, or 0 if it has none.
 *
 * @param post Post record from core-data.
 */
function toFeaturedMediaId(post: unknown): number {
  let id = 0;

  if (typeof post !== 'object' || post === null) {
    return id;
  }

  const {
    featured_media: featuredMedia,
  } = post as Record<string, unknown>;

  if (typeof featuredMedia === 'number' && Number.isInteger(featuredMedia) && featuredMedia > 0) {
    id = featuredMedia;
  }

  return id;
}

const NO_IDS: number[] = [];

/**
 * Maps each post type slug to its singular name.
 *
 * @param postTypes Post type records from core-data, or null while they load.
 */
function toPostTypeLabels(postTypes: unknown): Record<string, string> {
  const out: Record<string, string> = {};

  if (!Array.isArray(postTypes)) {
    return out;
  }

  postTypes.forEach((postType: unknown) => {
    if (typeof postType !== 'object' || postType === null) {
      return;
    }

    const {
      labels,
      slug,
    } = postType as Record<string, unknown>;

    if (typeof slug !== 'string' || typeof labels !== 'object' || labels === null) {
      return;
    }

    const {
      singular_name: singularName,
    } = labels as Record<string, unknown>;

    if (typeof singularName === 'string') {
      out[slug] = singularName;
    }
  });

  return out;
}

/**
 * Reads the raw title of a post record, or an empty string if it has none.
 *
 * @param post Post record from core-data.
 */
function toPostTitle(post: unknown): string {
  let title = '';

  if (typeof post !== 'object' || post === null) {
    return title;
  }

  const {
    title: titleObject,
  } = post as Record<string, unknown>;

  if (typeof titleObject !== 'object' || titleObject === null) {
    return title;
  }

  const {
    raw,
  } = titleObject as Record<string, unknown>;

  if (typeof raw === 'string') {
    title = raw;
  }

  return title;
}

/**
 * Modal for picking one post from a block's channel.
 */
export default function PostPicker({
  args,
  channel,
  clientId,
  selectedId,
  onClose,
  onSelect,
}: {
  args: Record<string, unknown>;
  channel: string;
  clientId: string;
  selectedId: number;
  onClose: () => void;
  onSelect: (id: number, postType: string) => void;
}) {
  const [selection, setSelection] = useState<string[]>(selectedId > 0 ? [String(selectedId)] : []);
  const [view, setView] = useState<any>({
    fields: ['postType', 'status', 'date'],
    filters: [],
    mediaField: 'media',
    page: 1,
    perPage: CHANNEL_PAGE_SIZE,
    search: '',
    sort: {
      direction: 'desc',
      field: CHANNEL_ORDER,
    },
    titleField: 'title',
    type: 'pickerTable',
  });

  let page = 1;
  let perPage = CHANNEL_PAGE_SIZE;
  let search = '';

  if (Number.isInteger(view.page) && view.page > 0) {
    page = view.page;
  }

  if (Number.isInteger(view.perPage) && view.perPage > 0) {
    perPage = view.perPage;
  }

  if (typeof view.search === 'string') {
    search = view.search.trim();
  }

  // The context that the block's queue gives the channel, which the picker gives it too.
  const contextKey: string = useSelect((select) => {
    const blockContext = channelQueueContext(select, clientId);

    let key = 'null';

    if (blockContext !== null) {
      key = JSON.stringify(channelContext(select, channel, blockContext));
    }

    return key;
  }, [channel, clientId]);

  const context: Record<string, unknown> | null = useMemo(
    () => JSON.parse(contextKey),
    [contextKey],
  );

  let resultsChannel = '';
  let resultsContext: Record<string, unknown> = {};

  // Context is required.
  if (context !== null) {
    resultsChannel = channel;
    resultsContext = context;
  }

  // The whole channel, for its label, which stays the same while a page loads.
  const channelResults = useChannelResults(resultsChannel, args, resultsContext);

  // Whether to include scheduled posts is a per-channel setting.
  const canFilterByStatus = channelResults !== null && channelResults.post_statuses.includes('future');
  const fields = useMemo(() => [...FIELDS, toStatusField(canFilterByStatus)], [canFilterByStatus]);
  const postStatuses = toPostStatuses(view, canFilterByStatus);

  // Select every status in the filter by default.
  const hasStatusFilter = useRef(false);

  useEffect(() => {
    if (canFilterByStatus && !hasStatusFilter.current) {
      hasStatusFilter.current = true;

      setView((current: any) => ({
        ...current,
        filters: [
          ...current.filters,
          { field: 'status', operator: 'isAny', value: PUBLISHED_AND_SCHEDULED },
        ],
      }));
    }
  }, [canFilterByStatus]);

  const {
    getTypeOfPostInChannel,
  } = useSelect((select) => select('wp-curate/channels') as any, []);

  // The current page, or null while it loads.
  const resultsPage: ChannelResultsPage | null = useSelect((select) => {
    const {
      getChannelResultsPage,
    } = select('wp-curate/channels') as any;

    let out: ChannelResultsPage | null = null;

    if (context !== null) {
      out = getChannelResultsPage(channel, args, context, search, postStatuses, page, perPage);
    }

    return out;
  }, [args, channel, context, page, perPage, postStatuses, search]);

  // The totals of the last page, so that the pagination doesn't change while the next page loads.
  const [paginationInfo, setPaginationInfo] = useState({ totalItems: 0, totalPages: 0 });

  if (
    resultsPage !== null
    && (
      resultsPage.total !== paginationInfo.totalItems
      || resultsPage.total_pages !== paginationInfo.totalPages
    )
  ) {
    setPaginationInfo({
      totalItems: resultsPage.total,
      totalPages: resultsPage.total_pages,
    });
  }

  let title: string = __('Select a post', 'wp-curate');

  if (channelResults !== null && channelResults.label !== '') {
    title = channelResults.label;
  }

  let pageIds = NO_IDS;

  if (resultsPage !== null) {
    pageIds = resultsPage.ids;
  }

  // A channel can mix post types, so make one query for the posts of each type on the page.
  const queries = useMemo(() => {
    const idsByPostType: Record<string, number[]> = {};

    if (resultsPage !== null) {
      pageIds.forEach((id) => {
        if (id in resultsPage.post_types) {
          const postType = resultsPage.post_types[id];

          if (!(postType in idsByPostType)) {
            idsByPostType[postType] = [];
          }

          idsByPostType[postType].push(id);
        }
      });
    }

    // The REST API returns only published posts by default.
    return Object.entries(idsByPostType).map(([postType, ids]) => ({
      postType,
      query: {
        include: ids.join(','),
        per_page: ids.length,
        status: postStatuses.join(','),
      },
    }));
  }, [pageIds, postStatuses, resultsPage]);

  /*
   * Each item is the array that core-data holds for a query, so the result is stable between
   * calls. An item is null until its query loads.
   */
  const recordLists = useSelect((select) => {
    const {
      getEntityRecords,
    } = select(coreStore);

    return queries.map(({
      postType,
      query,
    }) => getEntityRecords('postType', postType, query));
  }, [queries]);

  let isLoading = resultsPage === null;

  recordLists.forEach((records: unknown) => {
    if (records === null) {
      isLoading = true;
    }
  });

  const postsById = useMemo(() => {
    const out: Record<number, unknown> = {};

    recordLists.forEach((records: unknown) => {
      if (Array.isArray(records)) {
        records.forEach((record: any) => {
          out[record.id] = record;
        });
      }
    });

    return out;
  }, [recordLists]);

  // Load the featured image of every post on the page in one request.
  const imageQuery = useMemo(() => {
    const imageIds: number[] = [];
    let query: Record<string, unknown> | null = null;

    Object.values(postsById).forEach((post) => {
      const imageId = toFeaturedMediaId(post);

      if (imageId > 0 && !imageIds.includes(imageId)) {
        imageIds.push(imageId);
      }
    });

    if (imageIds.length > 0) {
      query = {
        include: imageIds.join(','),
        per_page: imageIds.length,
      };
    }

    return query;
  }, [postsById]);

  const images = useSelect((select) => {
    const {
      getEntityRecords,
    } = select(coreStore);

    let records: unknown[] | null = null;

    if (imageQuery !== null) {
      records = getEntityRecords('postType', 'attachment', imageQuery);
    }

    return records;
  }, [imageQuery]);

  // Every post type, for its name. The editor has usually loaded them already.
  const postTypes = useSelect((select) => {
    const {
      getPostTypes,
    } = select(coreStore);

    return getPostTypes({ per_page: -1 });
  }, []);

  // List the page's posts in channel order.
  const data = useMemo(() => {
    const imageUrls: Record<number, string> = {};
    const items: PickerItem[] = [];
    const postTypeLabels = toPostTypeLabels(postTypes);

    if (Array.isArray(images)) {
      images.forEach((image: any) => {
        // A grid shows images larger than a thumbnail.
        imageUrls[image.id] = getMediaUrl(image, 'medium');
      });
    }

    pageIds.forEach((id) => {
      let itemTitle: string = __('(no title)', 'wp-curate');
      let imageUrl = '';
      let status = '';
      let date = '';
      let postType = '';

      if (resultsPage !== null && id in resultsPage.post_types) {
        postType = resultsPage.post_types[id];
      }

      // Show the slug of a post type that the user cannot read.
      if (postType in postTypeLabels) {
        postType = postTypeLabels[postType];
      }

      if (id in postsById && toPostTitle(postsById[id]) !== '') {
        itemTitle = toPostTitle(postsById[id]);
      }

      if (id in postsById && toFeaturedMediaId(postsById[id]) in imageUrls) {
        imageUrl = imageUrls[toFeaturedMediaId(postsById[id])];
      }

      if (id in postsById) {
        status = toPostString(postsById[id], 'status');
        date = toPostString(postsById[id], 'date');
      }

      if (id in postsById) {
        items.push({
          date,
          id,
          imageUrl,
          postType,
          status,
          title: itemTitle,
        });
      }
    });

    return items;
  }, [images, pageIds, postTypes, postsById, resultsPage]);

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

              // The selected post can be on a page that the picker showed before.
              if (Number.isInteger(id) && id > 0) {
                onSelect(id, getTypeOfPostInChannel(id));
              }
            },
            id: 'select',
            isPrimary: true,
            label: __('Select', 'wp-curate'),
            supportsBulk: false,
          },
        ]}
        data={data}
        defaultLayouts={{ pickerGrid: {}, pickerTable: {} }}
        fields={fields}
        getItemId={(item: PickerItem) => String(item.id)}
        isLoading={isLoading}
        itemListLabel={__('Posts', 'wp-curate')}
        onChangeSelection={setSelection}
        onChangeView={setView}
        paginationInfo={paginationInfo}
        searchLabel={__('Search posts', 'wp-curate')}
        selection={selection}
        view={view}
      />
    </Modal>
  );
}
