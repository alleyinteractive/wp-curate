/**
 * A block whose inner blocks are kept the same as those of the other blocks in its group.
 */
export interface LayoutMember {
  // The group of the block. Blocks with the same group have the same inner blocks.
  group: string;
  // The inner blocks of the block. Only the identity of the value is compared.
  innerBlocks: unknown;
}

/**
 * Each block in a group, by client ID, at one time.
 */
export type LayoutSnapshot = Map<string, LayoutMember>;

/**
 * A copy of the inner blocks of one block to other blocks.
 */
export interface LayoutCopy {
  // Client ID of the block to copy from.
  source: string;
  // Client IDs of the blocks to copy to.
  targets: string[];
}

/**
 * Plans the copies that keep the inner blocks of the blocks in each group the same.
 *
 * Compares the blocks as they are now to the blocks as they were. In each group:
 *
 * - If the inner blocks of one block changed, copy them to the other blocks of the group.
 * - If no inner blocks changed, but blocks joined the group, copy the inner blocks of a block that
 *   was in the group to the blocks that joined. A block joins a group when it is new, or when its
 *   group changes, such as when it is pasted, duplicated, or moved into the group.
 * - If the inner blocks of more than one block changed, such as by undo or redo, copy nothing,
 *   because there is no one block to follow.
 * - If all of the blocks joined at once, such as when the post loads, copy nothing.
 *
 * @param before The blocks as they were.
 * @param now    The blocks as they are now.
 */
export default function planLayoutCopies(
  before: LayoutSnapshot,
  now: LayoutSnapshot,
): LayoutCopy[] {
  const membersByGroup = new Map<string, string[]>();

  now.forEach(({ group }, clientId) => {
    let members = membersByGroup.get(group);

    if (members === undefined) {
      members = [];
      membersByGroup.set(group, members);
    }

    members.push(clientId);
  });

  const out: LayoutCopy[] = [];

  membersByGroup.forEach((members, group) => {
    if (members.length < 2) {
      return;
    }

    const changed: string[] = [];
    const joined: string[] = [];

    members.forEach((clientId) => {
      const was = before.get(clientId);
      const is = now.get(clientId);

      if (was === undefined || was.group !== group) {
        joined.push(clientId);
      } else if (is !== undefined && was.innerBlocks !== is.innerBlocks) {
        changed.push(clientId);
      }
    });

    if (changed.length === 1) {
      const [source] = changed;

      out.push({
        source,
        targets: members.filter((clientId) => clientId !== source),
      });
    } else if (changed.length === 0 && joined.length > 0) {
      const existing = members.find((clientId) => !joined.includes(clientId));

      if (existing !== undefined) {
        out.push({
          source: existing,
          targets: joined,
        });
      }
    }
  });

  return out;
}
