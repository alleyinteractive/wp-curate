// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { Modal } from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { DataViewsPicker } from '@wordpress/dataviews';
import { useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// Plugin dependencies.
import useChannelRecord, { CHANNEL_PAGE_SIZE } from '../../../hooks/useChannelRecord';

interface PostPickerProps {
  channel: string;
  selectedId: number;
  onClose: () => void;
  onSelect: (id: number, postType: string) => void;
}

interface PickerItem {
  id: number;
  imageUrl: string;
  title: string;
}

const FIELDS = [
  {
    enableHiding: false,
    enableSorting: false,
    id: 'media',
    label: __('Featured image', 'wp-curate'),
    render: ({ item }: { item: PickerItem }) => (item.imageUrl !== '' ? <img src={item.imageUrl} alt="" /> : null),
    type: 'media' as const,
  },
  {
    enableHiding: false,
    enableSorting: false,
    getValue: ({ item }: { item: PickerItem }) => item.title,
    id: 'title',
    label: __('Title', 'wp-curate'),
  },
];

// Image sizes for the picker, smallest first.
const PICKER_IMAGE_SIZES = ['thumbnail', 'medium'];

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

/**
 * Reads the URL of an attachment record at the first picker size it has, or at full size if it
 * has none of them.
 *
 * @param image Attachment record from core-data.
 */
function toPickerImageUrl(image: unknown): string {
  let url = '';

  if (typeof image !== 'object' || image === null) {
    return url;
  }

  const {
    media_details: mediaDetails,
    source_url: sourceUrl,
  } = image as Record<string, unknown>;

  if (typeof sourceUrl === 'string') {
    url = sourceUrl;
  }

  if (typeof mediaDetails !== 'object' || mediaDetails === null) {
    return url;
  }

  const {
    sizes,
  } = mediaDetails as Record<string, unknown>;

  if (typeof sizes !== 'object' || sizes === null) {
    return url;
  }

  const sizeName = PICKER_IMAGE_SIZES.find((name) => name in sizes);

  if (sizeName === undefined) {
    return url;
  }

  const size = (sizes as Record<string, unknown>)[sizeName];

  if (typeof size !== 'object' || size === null) {
    return url;
  }

  const {
    source_url: sizeUrl,
  } = size as Record<string, unknown>;

  if (typeof sizeUrl === 'string') {
    url = sizeUrl;
  }

  return url;
}

const NO_IDS: number[] = [];

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
 *
 * The channel loads one page at a time, so the picker shows the posts in channel order, without
 * search, and offers one more page while the channel has more posts.
 */
export default function PostPicker({
  channel,
  selectedId,
  onClose,
  onSelect,
}: PostPickerProps) {
  const [selection, setSelection] = useState<string[]>(selectedId > 0 ? [String(selectedId)] : []);
  const [view, setView] = useState<any>({
    fields: [],
    filters: [],
    mediaField: 'media',
    page: 1,
    perPage: CHANNEL_PAGE_SIZE,
    search: '',
    titleField: 'title',
    type: 'pickerTable',
  });

  let page = 1;

  if (Number.isInteger(view.page) && view.page > 0) {
    page = view.page;
  }

  // The record so far, which stays available while the next page loads.
  const loadedRecord = useChannelRecord(channel, {}, CHANNEL_PAGE_SIZE);

  // The record through the current page, or null while that page loads.
  const pageRecord = useChannelRecord(channel, {}, page * CHANNEL_PAGE_SIZE);

  let title: string = __('Select a post', 'wp-curate');
  let totalItems = 0;
  let totalPages = 0;

  if (loadedRecord !== null && loadedRecord.label !== '') {
    title = loadedRecord.label;
  }

  // The channel has no total, so count the loaded posts, plus one page while there are more.
  if (loadedRecord !== null) {
    totalItems = loadedRecord.ids.length;
    totalPages = Math.ceil(loadedRecord.ids.length / CHANNEL_PAGE_SIZE);
  }

  if (loadedRecord !== null && loadedRecord.has_more) {
    totalItems += 1;
    totalPages += 1;
  }

  const pageIds = useMemo(() => {
    let ids = NO_IDS;

    if (pageRecord !== null) {
      ids = pageRecord.ids.slice((page - 1) * CHANNEL_PAGE_SIZE, page * CHANNEL_PAGE_SIZE);
    }

    return ids;
  }, [page, pageRecord]);

  // A channel can mix post types, so make one query for the posts of each type on the page.
  const queries = useMemo(() => {
    const idsByPostType: Record<string, number[]> = {};

    if (pageRecord !== null) {
      pageIds.forEach((id) => {
        if (id in pageRecord.post_types) {
          const postType = pageRecord.post_types[id];

          if (!(postType in idsByPostType)) {
            idsByPostType[postType] = [];
          }

          idsByPostType[postType].push(id);
        }
      });
    }

    return Object.entries(idsByPostType).map(([postType, ids]) => ({
      postType,
      query: {
        include: ids.join(','),
        per_page: ids.length,
      },
    }));
  }, [pageIds, pageRecord]);

  /*
   * Each item is the array that core-data holds for a query, so the result is stable between
   * calls. An item is null until its query loads.
   */
  const recordLists = useSelect((select) => {
    const {
      getEntityRecords,
    } = select(coreStore);

    return queries.map(({ postType, query }) => getEntityRecords('postType', postType, query));
  }, [queries]);

  let isLoading = pageRecord === null;

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

  // List the page's posts in channel order.
  const data = useMemo(() => {
    const imageUrls: Record<number, string> = {};
    const items: PickerItem[] = [];

    if (Array.isArray(images)) {
      images.forEach((image: any) => {
        imageUrls[image.id] = toPickerImageUrl(image);
      });
    }

    pageIds.forEach((id) => {
      let itemTitle: string = __('(no title)', 'wp-curate');
      let imageUrl = '';

      if (id in postsById && toPostTitle(postsById[id]) !== '') {
        itemTitle = toPostTitle(postsById[id]);
      }

      if (id in postsById && toFeaturedMediaId(postsById[id]) in imageUrls) {
        imageUrl = imageUrls[toFeaturedMediaId(postsById[id])];
      }

      if (id in postsById) {
        items.push({
          id,
          imageUrl,
          title: itemTitle,
        });
      }
    });

    return items;
  }, [images, pageIds, postsById]);

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
              let postType = '';

              if (loadedRecord !== null && id in loadedRecord.post_types) {
                postType = loadedRecord.post_types[id];
              }

              if (Number.isInteger(id) && id > 0) {
                onSelect(id, postType);
              }
            },
            id: 'select',
            isPrimary: true,
            label: __('Select', 'wp-curate'),
            supportsBulk: false,
          },
        ]}
        config={{ perPageSizes: [CHANNEL_PAGE_SIZE] }}
        data={data}
        defaultLayouts={{ pickerTable: {} }}
        fields={FIELDS}
        getItemId={(item: PickerItem) => String(item.id)}
        isLoading={isLoading}
        itemListLabel={__('Posts', 'wp-curate')}
        onChangeSelection={setSelection}
        onChangeView={setView}
        paginationInfo={{ totalItems, totalPages }}
        search={false}
        selection={selection}
        view={view}
      />
    </Modal>
  );
}
