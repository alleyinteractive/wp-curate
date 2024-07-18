import { __ } from '@wordpress/i18n';
import { PlainText, useBlockProps } from '@wordpress/block-editor';
import { dispatch, select } from '@wordpress/data';
import { useEntityProp } from '@wordpress/core-data';

import './index.scss';

interface PostTitleEditProps {
  clientId?: string;
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
    customPostTitles?: {
      postId: number;
      title: string;
    }[];
  };
  isSelected?: boolean;
}

/**
 * The wp-curate/post-title block edit function.
 *
 * @return {WPElement} Element to render.
 */
export default function Edit({
  clientId,
  context,
}: PostTitleEditProps) {
  // @ts-ignore
  const queryParentId = select('core/block-editor').getBlockParentsByBlockName(clientId, 'wp-curate/query')[0];
  const { customPostTitles = [], postId, pinnedPosts = [] } = context;
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

      dispatch('core/block-editor').updateBlockAttributes(queryParentId, {
        customPostTitles: newCustomPostTitles,
      });
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
