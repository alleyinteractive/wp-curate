// Global dependencies.
import React from 'react';

// WordPress dependencies.
import {
  store as blockEditorStore,
  useBlockProps,
  useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
  BlockEditProps,
  BlockInstance,
  InnerBlockTemplate,
  createBlocksFromInnerBlocksTemplate,
  getBlockType,
} from '@wordpress/blocks';
import { useDispatch, useRegistry } from '@wordpress/data';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from '@wordpress/element';

const ALLOWED_BLOCKS = ['wp-curate/single-post'];

const DEFAULT_BLOCK = {
  name: 'wp-curate/single-post',
};

/**
 * The attributes of a block that the editor saves in the block's comment delimiter: no local or
 * sourced attributes, and no attributes with their default value.
 *
 * @param name       Block name.
 * @param attributes Block attributes.
 */
function toCommentAttributes(
  name: string,
  attributes: Record<string, unknown>,
): Record<string, unknown> {
  const blockType = getBlockType(name);
  const out: Record<string, unknown> = {};

  if (blockType === undefined) {
    return { ...attributes };
  }

  Object.entries(blockType.attributes).forEach(([key, schema]: [string, any]) => {
    const value = attributes[key];

    if (value === undefined || schema.source !== undefined || schema.role === 'local') {
      return;
    }

    if ('default' in schema && JSON.stringify(schema.default) === JSON.stringify(value)) {
      return;
    }

    out[key] = value;
  });

  return out;
}

/**
 * Converts Single Post blocks to the `posts` attribute: a template in the shape of
 * `InnerBlockTemplate`, without inner blocks.
 *
 * @param blocks Single Post blocks.
 */
function toPosts(blocks: BlockInstance[]): InnerBlockTemplate[] {
  return blocks.map(({
    attributes,
    name,
  }) => {
    const commentAttributes = toCommentAttributes(name, attributes);

    let item: InnerBlockTemplate = [name];

    if (Object.keys(commentAttributes).length > 0) {
      item = [name, commentAttributes];
    }

    return item;
  });
}

/**
 * The wp-curate/channel-loop block edit function.
 *
 * The block saves its Single Post blocks in the `posts` attribute, and saves the template of the
 * Single Post blocks as its inner blocks, so that static blocks in the template keep their HTML.
 *
 * In the editor, the inner blocks are the Single Post blocks, which each show one post, so the
 * number of them is the number of posts. They are controlled: they come from the `posts`
 * attribute, and each change goes back to it. The template is in the `template` attribute, which
 * the editor does not save in the comment delimiter. The Single Posts read and edit it. When the
 * editor parses the block, `deprecated` moves the template from the inner blocks to the attribute.
 *
 * Like core's Post Template inside a Query block, the block has no channel of its own: the Single
 * Posts use the channel of the Channel Content block around it.
 *
 * A Single Post moved in from outside uses this block's template instead of its own inner blocks,
 * and keeps its pinned post.
 */
export default function Edit({
  attributes: {
    posts,
  },
  clientId,
  setAttributes,
}: BlockEditProps<{
  posts: InnerBlockTemplate[];
  template: InnerBlockTemplate[];
}> & {
  clientId: string;
}) {
  const {
    __unstableMarkNextChangeAsNotPersistent: markNextChangeAsNotPersistent,
  } = useDispatch(blockEditorStore) as any;

  // The last blocks that this block sent to the attribute, and the attribute made from them.
  const sent = useRef<{ blocks: BlockInstance[], posts: InnerBlockTemplate[] } | null>(null);

  /*
   * The Single Post blocks. If this block made the attribute, reuse its blocks, so that new ones
   * do not replace them.
   */
  const value = useMemo(() => {
    let blocks: BlockInstance[] = [];

    if (sent.current !== null && sent.current.posts === posts) {
      ({
        blocks,
      } = sent.current);
    } else if (Array.isArray(posts)) {
      blocks = createBlocksFromInnerBlocksTemplate(posts);
    }

    return blocks;
  }, [posts]);

  // The `posts` attribute that the inner blocks match: the one they came from, or the last sent.
  const matched = useRef(posts);

  useEffect(() => {
    matched.current = posts;
  }, [posts]);

  // `useRegistry` is typed as returning `Function`.
  const registry = useRegistry() as unknown as { select: (store: unknown) => unknown };

  /*
   * Sends the Single Post blocks to the `posts` attribute. A change to the inner blocks that is not
   * persistent, such as one that the editor makes, makes a change to the attribute that is not
   * persistent.
   */
  const send = useCallback((blocks: BlockInstance[], isPersistent: boolean) => {
    const {
      getBlockAttributes,
    } = registry.select(blockEditorStore) as any;

    const current = getBlockAttributes(clientId).posts;

    /*
     * When the attribute changes outside this block, such as by undo, the editor can report the
     * inner blocks from before the change. Skip them: the inner blocks are about to follow the
     * attribute.
     */
    if (current !== matched.current) {
      return;
    }

    const next = toPosts(blocks);

    /*
     * A change that does not change the attribute would still make the post dirty, or clear the
     * redo history. Compare both in the same form.
     */
    let currentBlocks: BlockInstance[] = [];

    if (Array.isArray(current)) {
      currentBlocks = createBlocksFromInnerBlocksTemplate(current);
    }

    if (JSON.stringify(next) === JSON.stringify(toPosts(currentBlocks))) {
      return;
    }

    sent.current = {
      blocks,
      posts: next,
    };
    matched.current = next;

    if (!isPersistent) {
      markNextChangeAsNotPersistent();
    }

    setAttributes({ posts: next });
  }, [clientId, markNextChangeAsNotPersistent, registry, setAttributes]);

  const onChange = useCallback((blocks: BlockInstance[]) => send(blocks, true), [send]);
  const onInput = useCallback((blocks: BlockInstance[]) => send(blocks, false), [send]);

  const blockProps = useBlockProps();
  const combinedBlockProps = useInnerBlocksProps(
    blockProps,
    {
      allowedBlocks: ALLOWED_BLOCKS,
      // The appender adds another post.
      // @ts-expect-error defaultBlock and directInsert not available in types yet.
      defaultBlock: DEFAULT_BLOCK,
      directInsert: true,
      onChange,
      onInput,
      value,
    },
  );

  return <div {...combinedBlockProps} />;
}
