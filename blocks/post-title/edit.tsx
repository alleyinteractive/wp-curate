import { __ } from '@wordpress/i18n';
import { PlainText, useBlockProps } from '@wordpress/block-editor';
import { dispatch, select } from '@wordpress/data';
import { useEntityProp } from '@wordpress/core-data';

import './index.scss';

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
  const { postId, pinnedPosts = [] } = context;
  const { customPostTitles = [] } = attributes;
  const [rawTitle = '', setTitle, fullTitle] = useEntityProp('postType', context?.query?.postType, 'title', postId);
  const [link] = useEntityProp('postType', context?.query?.postType, 'link', postId);
  const isPinned = pinnedPosts.includes(postId);
  const currentCustomPostTitle = customPostTitles.find((item) => item?.postId === postId);

  // @todo: handle removing custom title when post is "unpinned".
  // useEffect(() => {
  //   if (?) {
  //     dispatch('core/block-editor').updateBlockAttributes(queryParentId, {
  //       customPostTitles: customPostTitles.filter((item) => item?.postId !== postId),
  //     });
  //   }
  // }, [isPinned, postId, customPostTitles, queryParentId]);

  let titleElement = (
    <h1 {...useBlockProps}>
      {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
      <a
        href={link}
        onClick={(event) => event.preventDefault()}
        dangerouslySetInnerHTML={{
          __html: fullTitle?.rendered,
        }}
      />
    </h1>
  );

  if (isPinned) {
    const handleOnChange = (newTitle: string) => {
      let newCustomPostTitles = [...customPostTitles];

      // Handle updating existing and new custom post titles.
      if (currentCustomPostTitle) {
        currentCustomPostTitle.title = newTitle;
      } else {
        newCustomPostTitles = [
          ...customPostTitles,
          {
            postId,
            title: newTitle,
          },
        ];
      }

      setAttributes({ customPostTitles: newCustomPostTitles });
    };

    titleElement = (
      <h1 {...useBlockProps}>
        <PlainText
          tagName="a"
          href={link}
          placeholder={!rawTitle.length ? __('No Title') : null}
          value={currentCustomPostTitle?.title ? currentCustomPostTitle?.title : rawTitle}
          onChange={handleOnChange}
        />
      </h1>
    );
  }

  return (
    <>
      { titleElement }
    </>
  );
}
