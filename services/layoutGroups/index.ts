// Global dependencies.
import { v4 as uuid, validate as validateUuid } from 'uuid'; // eslint-disable-line import/no-unresolved

/*
 * Single Post blocks with the same value in this attribute share a layout: the editor keeps their
 * inner blocks the same. An empty value means no group. The value has no effect on the page,
 * because each Single Post saves its own copy of the layout. The editor makes UUIDs. Patterns can
 * use other keys. See `isTemplateKey()`.
 */
export const LAYOUT_GROUP_ATTRIBUTE = 'layoutGroup';

// The block type that can be in a group.
export const SINGLE_POST_BLOCK = 'wp-curate/single-post';

/**
 * A new value for the `layoutGroup` attribute.
 */
export function newLayoutGroupKey(): string {
  return uuid();
}

/**
 * The value of the `layoutGroup` attribute in a block's attributes, or an empty string.
 *
 * @param attributes Attributes of the block.
 */
export function toLayoutGroupKey(attributes: unknown): string {
  if (typeof attributes !== 'object' || attributes === null) {
    return '';
  }

  const value = (attributes as Record<string, unknown>)[LAYOUT_GROUP_ATTRIBUTE];

  if (typeof value !== 'string') {
    return '';
  }

  return value;
}

/**
 * The client ID of the nearest block around a block whose inner blocks are controlled, or an
 * empty string if there is none.
 *
 * A block with controlled inner blocks, like a synced pattern or a template part, shows another
 * entity. Groups do not cross from one entity to another, so that a change in one post does not
 * change a pattern or template part that other posts also use.
 *
 * @param selectors The selectors of the block editor store.
 * @param clientId  Client ID of the block.
 */
export function entityRootOf(selectors: any, clientId: string): string {
  const {
    areInnerBlocksControlled,
    getBlockParents,
  } = selectors;

  const parents: string[] = getBlockParents(clientId, true);
  const root = parents.find((id) => areInnerBlocksControlled(id));

  if (root === undefined) {
    return '';
  }

  return root;
}

/**
 * The group of a Single Post block, or an empty string if it has no group.
 *
 * The group is the block's `layoutGroup` key in its entity. See `entityRootOf()`.
 *
 * @param selectors The selectors of the block editor store.
 * @param clientId  Client ID of the block.
 */
export function layoutGroupOf(selectors: any, clientId: string): string {
  const {
    getBlockAttributes,
  } = selectors;

  const key = toLayoutGroupKey(getBlockAttributes(clientId));

  if (key === '') {
    return '';
  }

  return `${entityRootOf(selectors, clientId)}/${key}`;
}

/**
 * The client IDs of the Single Post blocks in the group of a block, including the block. Empty if
 * the block has no group.
 *
 * @param selectors The selectors of the block editor store.
 * @param clientId  Client ID of the block.
 */
export function layoutGroupMembers(selectors: any, clientId: string): string[] {
  const {
    getBlocksByName,
  } = selectors;

  const group = layoutGroupOf(selectors, clientId);

  if (group === '') {
    return [];
  }

  const all: string[] = getBlocksByName(SINGLE_POST_BLOCK);

  return all.filter((id) => layoutGroupOf(selectors, id) === group);
}

/**
 * A layout that a Single Post block can take, and the Single Post blocks that have it.
 */
export interface LayoutChoice {
  /** Client IDs of the Single Post blocks, in the order of the post. */
  members: string[];
}

/**
 * The layouts of the Single Post blocks in the entity of a block, with the blocks that have each
 * layout. See `entityRootOf()`.
 *
 * The blocks in one layout group are one choice. Each Single Post that is not in a group is a
 * choice of its own. Single Posts without inner blocks have no layout yet, so they are not in a
 * choice.
 *
 * @param selectors The selectors of the block editor store.
 * @param clientId  Client ID of the block.
 */
export function layoutChoicesOf(selectors: any, clientId: string): LayoutChoice[] {
  const {
    getBlockCount,
    getBlocksByName,
  } = selectors;

  const root = entityRootOf(selectors, clientId);
  const choices = new Map<string, LayoutChoice>();
  const all: string[] = getBlocksByName(SINGLE_POST_BLOCK);

  all.forEach((id) => {
    if (getBlockCount(id) === 0 || entityRootOf(selectors, id) !== root) {
      return;
    }

    const group = layoutGroupOf(selectors, id);
    const choiceId = group !== '' ? group : `block:${id}`;
    const choice = choices.get(choiceId);

    if (choice === undefined) {
      choices.set(choiceId, { members: [id] });
    } else {
      choice.members.push(id);
    }
  });

  return Array.from(choices.values());
}

/**
 * Whether a `layoutGroup` key is a template key, which the editor replaces with a new key.
 *
 * The editor makes only UUIDs. Any other key, such as `"list"`, is a template key, for patterns
 * and other markup that is written by hand. Each time that such markup is inserted, its blocks
 * must make a new group, not join the group of the blocks from an earlier insert.
 *
 * @param key The value of the `layoutGroup` attribute.
 */
export function isTemplateKey(key: string): boolean {
  return key !== '' && !validateUuid(key);
}

/**
 * The new keys for the Single Post blocks that have a template key. See `isTemplateKey()`.
 *
 * The blocks with the same template key in the same entity get the same new key. See
 * `entityRootOf()`.
 *
 * @param selectors The selectors of the block editor store.
 * @return New keys, by client ID. Empty if no block has a template key.
 */
export function replacementKeysOf(selectors: any): Map<string, string> {
  const {
    getBlockAttributes,
    getBlocksByName,
  } = selectors;

  const out = new Map<string, string>();
  const newKeys = new Map<string, string>();
  const all: string[] = getBlocksByName(SINGLE_POST_BLOCK);

  all.forEach((id) => {
    const key = toLayoutGroupKey(getBlockAttributes(id));

    if (!isTemplateKey(key)) {
      return;
    }

    const group = `${entityRootOf(selectors, id)}/${key}`;
    let newKey = newKeys.get(group);

    if (newKey === undefined) {
      newKey = newLayoutGroupKey();
      newKeys.set(group, newKey);
    }

    out.set(id, newKey);
  });

  return out;
}
