// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { InnerBlockTemplate } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import {
  postContent,
  postDate,
  postExcerpt,
  postFeaturedImage,
} from '@wordpress/icons';

/**
 * The inner blocks of a Single Post block, plus a name, title, and icon for a variation picker.
 */
export interface SinglePostLayout {
  /** The blocks that show the post. */
  blocks: InnerBlockTemplate[];
  /** The icon of the block that makes the layout different from the others. */
  icon: React.JSX.Element;
  /** Machine name. */
  name: string;
  /** Human-readable name. */
  title: string;
}

const SINGLE_POST_LAYOUTS: SinglePostLayout[] = [
  {
    blocks: [
      ['core/post-title', { isLink: true }],
      ['core/post-date'],
    ],
    icon: postDate,
    name: 'title-date',
    title: __('Title & Date', 'wp-curate'),
  },
  {
    blocks: [
      ['core/post-title', { isLink: true }],
      ['core/post-excerpt'],
    ],
    icon: postExcerpt,
    name: 'title-excerpt',
    title: __('Title & Excerpt', 'wp-curate'),
  },
  {
    blocks: [
      ['core/post-title', { isLink: true }],
      ['core/post-date'],
      ['core/post-excerpt'],
    ],
    icon: postContent,
    name: 'title-date-excerpt',
    title: __('Title, Date, & Excerpt', 'wp-curate'),
  },
  {
    blocks: [
      ['core/post-featured-image'],
      ['core/post-date'],
      ['core/post-title', { isLink: true }],
    ],
    icon: postFeaturedImage,
    name: 'image-date-title',
    title: __('Image, Date, & Title', 'wp-curate'),
  },
];

export default SINGLE_POST_LAYOUTS;
