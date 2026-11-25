// Global dependencies.
import classnames from 'classnames';
import React from 'react';

// WordPress dependencies.
import {
  // @ts-expect-error BlockContextProvider not available in types yet.
  BlockContextProvider,
  store as blockEditorStore,
  useBlockProps,
  useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
  BlockEditProps,
  store as blocksStore,
} from '@wordpress/blocks';
import { useSelect } from '@wordpress/data';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

// Plugin dependencies.
import LayoutVariationPicker from '../../components/LayoutVariationPicker';
import useChannelQueuePost from '../../hooks/useChannelQueue';

// Internal dependencies.
import SharedLayoutPanel from './components/shared-layout-panel';
import { useIsLayoutHighlighted } from './layout-highlight';
import './index.scss';

/**
 * The editable inner blocks of the block, which show its post. The post is in an `article`
 * element, like on the page. The inner blocks get the post as their `postId` and `postType`
 * context, as `Post_Template` gives it in `render.php`. Like on the page, they keep the channel of
 * a Channel Content block around this block, because `BlockContextProvider` merges with the
 * context around it.
 */
function PostInnerBlocks({
  blockProps,
  post,
}: {
  blockProps: Record<string, unknown>;
  post: { postId: number | null, postType: string };
}) {
  const innerBlocksProps = useInnerBlocksProps(blockProps);

  return (
    <BlockContextProvider value={post}>
      <article {...innerBlocksProps} />
    </BlockContextProvider>
  );
}

/**
 * The wp-curate/single-post block edit function.
 *
 * The `wp-curate/channels` block support gives the block its Channel panel. The
 * `wp-curate/single-post` support gives the toolbar, the pin, and the placeholders for a block
 * without a post. See `entries/block-editor/singlePostSupport`. The block reads its post from the
 * queue, and gives it only to its inner blocks, as `render.php` does. Its own `postId` context
 * stays the post around it.
 *
 * A block without inner blocks shows a picker of layouts. The support shows this function, not its
 * placeholders, while the picker shows. Single Posts with the same `layoutGroup` attribute share a
 * layout: the editor keeps their inner blocks the same, at any place in the post. See
 * `entries/block-editor/sharedLayouts`. The "Single Post Layout" panel in the Styles tab shows the
 * layouts in the post and the variations, and changes the group of the block.
 */
export default function Edit({
  clientId,
  name,
  setAttributes,
}: BlockEditProps<{
  layoutGroup: string;
}> & {
  clientId: string;
  name: string;
}) {
  const {
    blockType,
    hasInnerBlocks,
    isInSelection,
  } = useSelect((select) => {
    const {
      getBlockCount,
      hasSelectedInnerBlock,
      isBlockSelected,
    } = select(blockEditorStore) as any;

    const {
      getBlockType,
    } = select(blocksStore) as any;

    return {
      // The block type, for the title and icon of the picker.
      blockType: getBlockType(name),
      hasInnerBlocks: getBlockCount(clientId) > 0,
      isInSelection: isBlockSelected(clientId) || hasSelectedInnerBlock(clientId, true),
    };
  }, [clientId, name]);

  /*
   * The `has-block-overlay` class stops the inner blocks from taking clicks, like the block
   * overlay that core gives template parts. The style comes from core's block editor content
   * styles, which set `pointer-events: none` on the inner blocks of a block with this class.
   */
  const hasOverlay = hasInnerBlocks && !isInSelection;

  // The user points to the layout of this block in the "Single Post Layout" panel of a block.
  const isLayoutHighlighted = useIsLayoutHighlighted(clientId);

  const blockProps = useBlockProps({
    className: classnames({
      'has-block-overlay': hasOverlay,
      'is-layout-highlighted': isLayoutHighlighted,
    }),
  });

  // The post, null while the channel loads, or a post ID of 0 when there is no post to show.
  const post = useChannelQueuePost(clientId);

  // The post of the block, if it has one. The picker can show before the block has one.
  let shownPostId: number | null = null;
  let shownPostType = '';

  if (post !== null && post.postId > 0) {
    ({
      postId: shownPostId,
      postType: shownPostType,
    } = post);
  }

  const innerContext = useMemo(() => ({
    postId: shownPostId,
    postType: shownPostType,
  }), [shownPostId, shownPostType]);

  return (
    <>
      <SharedLayoutPanel
        clientId={clientId}
        onDetach={() => setAttributes({ layoutGroup: '' })}
        postId={shownPostId}
        postType={shownPostType}
      />

      {hasInnerBlocks ? (
        <PostInnerBlocks blockProps={blockProps} post={innerContext} />
      ) : (
        <LayoutVariationPicker
          blockProps={blockProps}
          clientId={clientId}
          icon={blockType.icon.src}
          instructions={__('Choose a layout for the post.', 'wp-curate')}
          label={blockType.title}
          name={name}
        />
      )}
    </>
  );
}
