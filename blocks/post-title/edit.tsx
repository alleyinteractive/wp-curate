import { __ } from '@wordpress/i18n';
import {
  InspectorControls,
  PlainText,
  store as blockEditorStore,
  useBlockProps,
} from '@wordpress/block-editor';
import { useEntityProp } from '@wordpress/core-data';
import {
  useEffect,
  type ComponentProps,
  type ComponentType,
} from 'react';
import { PanelBody, SelectControl } from '@wordpress/components';
import { dispatch, select } from '@wordpress/data';

type HeadingTag = 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

// PlainText passes `tagName` and `__experimentalVersion` through, but the types omit them.
const PlainTextField = PlainText as ComponentType<ComponentProps<typeof PlainText> & {
  tagName?: HeadingTag;
  __experimentalVersion?: number;
}>;

// Options for SelectControl.
const headingLevelOptions = [
  { label: 'p', value: '0' },
  { label: 'h1', value: '1' },
  { label: 'h2', value: '2' },
  { label: 'h3', value: '3' },
  { label: 'h4', value: '4' },
  { label: 'h5', value: '5' },
  { label: 'h6', value: '6' },
];

interface PostTitleEditProps {
  clientId?: string;
  attributes: {
    level?: number;
    supportsLevel?: boolean;
  };
  context: {
    postId: number;
    postType?: string;
    query: {
      perPage?: number;
      postType?: string;
      type?: string;
      include?: string;
      orderby?: string;
    };
    pinnedPosts?: Array<number | null>;
    customPostTitles?: {
      postId: number;
      title: string;
    }[];
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
  clientId,
  attributes,
  context,
  setAttributes,
}: PostTitleEditProps) {
  const queryParentIds = select('core/block-editor').getBlockParentsByBlockName(clientId, ['wp-curate/query', 'wp-curate/subquery']);
  const queryParentId = queryParentIds.length ? queryParentIds[queryParentIds.length - 1] : null;

  const {
    postId = null,
    postType: contextPostType,
    pinnedPosts = [],
    query: { postType: queryPostType = 'post' } = {},
    customPostTitles = [],
  } = context;
  const postType = contextPostType || queryPostType;
  const { level = 3, supportsLevel } = attributes;
  const [rawTitle = '', , fullTitle] = useEntityProp('postType', postType, 'title', postId?.toString());
  const isPinned = pinnedPosts.includes(postId);
  const currentCustomPostTitle = customPostTitles.find((item) => item?.postId === postId);
  const TagName = (!supportsLevel || level === 0 ? 'p' : `h${level}`) as HeadingTag;
  const blockProps = useBlockProps();

  useEffect(() => {
    /**
     * Handle case for removing custom title from collection if post is unpinned.
     */
    if (
      customPostTitles.length
      && (currentCustomPostTitle && !isPinned)
    ) {
      dispatch(blockEditorStore).updateBlockAttributes(queryParentId, {
        customPostTitles: customPostTitles.filter((item) => item?.postId !== postId),
      });
    }
  }, [isPinned, postId, customPostTitles, currentCustomPostTitle, setAttributes, queryParentId]);

  const handleOnChange = (title: string) => {
    if (!postId) {
      return;
    }

    /**
    * Handle case for removing custom title from the collection if a
    * custom title no longer exists.
    */
    if (
      (currentCustomPostTitle?.postId && currentCustomPostTitle?.title.length === 0)
      && title === rawTitle) {
      dispatch(blockEditorStore).updateBlockAttributes(queryParentId, {
        customPostTitles: customPostTitles.filter((item) => item?.postId !== postId),
      });
      return;
    }

    /**
     * Handle cases for when it's not necessary to update the collection of
     * custom titles
     */
    if (title === currentCustomPostTitle?.title) {
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
    // If the custom title matches the original title, we don't want to store it.
    if (title === rawTitle) {
      newCustomPostTitles = newCustomPostTitles.filter((item) => item?.postId !== postId);
    }

    dispatch(blockEditorStore).updateBlockAttributes(queryParentId, {
      customPostTitles: newCustomPostTitles,
    });
  };

  let titleElement = (
    <TagName
      {...blockProps}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: fullTitle?.rendered,
      }}
    />
  );

  if (isPinned) {
    titleElement = (
      <PlainTextField
        tagName={TagName}
        placeholder={__('Enter a custom title')}
        value={currentCustomPostTitle?.title ?? rawTitle}
        onChange={(newTitle: string) => handleOnChange(newTitle.trim())}
        onBlur={() => (currentCustomPostTitle?.title === '') && handleOnChange(rawTitle)}
        __experimentalVersion={2}
        {...blockProps}
      />
    );
  }

  return (
    <>
      { titleElement }
      {supportsLevel ? (
        <InspectorControls>
          <PanelBody
            title={__('Setup', 'wp-curate')}
            initialOpen
          >
            <SelectControl
              label={__('Heading Level')}
              value={level.toString()}
              options={headingLevelOptions}
              onChange={(newLevel) => {
                setAttributes({ level: parseInt(newLevel, 10) });
              }}
            />
          </PanelBody>
        </InspectorControls>
      ) : null}
    </>
  );
}
