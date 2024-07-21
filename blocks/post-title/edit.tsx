import { __ } from '@wordpress/i18n';
import { PlainText, useBlockProps } from '@wordpress/block-editor';
import { useEntityProp } from '@wordpress/core-data';

import './index.scss';
import { useEffect, useState } from 'react';

interface PostTitleEditProps {
  clientId?: string;
  attributes: {
    customPostTitles?: {
      postId: number;
      title: string;
    }[];
  };
  context: {
    postId: number;
    query: {
      perPage?: number;
      postType?: string;
      type?: string;
      include?: string;
      orderby?: string;
    };
    pinnedPosts?: Array<number>;
  };
  isSelected?: boolean;
  setAttributes: (attributes: any) => void;
}

/**
 * The wp-curate/post-title block edit function.
 *
 * @return {WPElement} Element to render.
 */
export default function Edit({
  attributes,
  context,
  setAttributes,
}: PostTitleEditProps) {
  // @ts-ignore
  const { postId, pinnedPosts = [], query: { postType = 'post' } } = context;
  const { customPostTitles = [] } = attributes;
  const [rawTitle = '', , fullTitle] = useEntityProp('postType', postType, 'title', postId.toString());
  const isPinned = pinnedPosts.includes(postId);
  const currentCustomPostTitle = customPostTitles.find((item) => item?.postId === postId);
  const [title, setTitle] = useState(rawTitle);

  useEffect(() => {
    /**
     * Handle case for removing custom title from collection if post is unpinned.
     */
    if (
      customPostTitles.length
      && (currentCustomPostTitle && !isPinned)
    ) {
      setAttributes(
        { customPostTitles: customPostTitles.filter((item) => item?.postId !== postId) },
      );
    }
  }, [isPinned, postId, customPostTitles, currentCustomPostTitle, setAttributes]);

  useEffect(() => {
    /**
     * Handle case for removing custom title from the collection if a
     * custom title no longer exists.
     */
    if (
      (currentCustomPostTitle?.postId && currentCustomPostTitle?.title.length === 0)
      && title === rawTitle) {
      setAttributes(
        { customPostTitles: customPostTitles.filter((item) => item?.postId !== postId) },
      );
      return;
    }

    /**
     * Handle cases for when it's not necessary to update the collection of
     * custom titles
     */
    if (
      title === rawTitle
      || title === currentCustomPostTitle?.title
    ) {
      return;
    }

    let newCustomPostTitles = [...customPostTitles];
    if (currentCustomPostTitle?.postId) {
      // Handle updating existing custom title in collection.
      currentCustomPostTitle.title = title;
    } else if (!currentCustomPostTitle?.postId) {
      // Handle adding new custom title in collection
      newCustomPostTitles = [
        ...customPostTitles,
        {
          postId,
          title,
        },
      ];
    }

    setAttributes({ customPostTitles: newCustomPostTitles });
  }, [title, customPostTitles, currentCustomPostTitle, postId, setAttributes, rawTitle]);

  let titleElement = (
    <h3
      {...useBlockProps}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: fullTitle?.rendered,
      }}
    />
  );

  if (isPinned) {
    titleElement = (
      <h3 {...useBlockProps}>
        <PlainText
          placeholder={__('Enter a custom title')}
          value={title ?? rawTitle}
          onChange={(newTitle: string) => setTitle(newTitle)}
          onBlur={() => (title === '') && setTitle(rawTitle)}
        />
      </h3>
    );
  }

  return (
    <>
      { titleElement }
    </>
  );
}
