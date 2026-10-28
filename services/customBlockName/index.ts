/**
 * The name that the user gave a block with the "Rename" option, or an empty string.
 *
 * @param attributes Block attributes.
 */
export default function customBlockName(attributes: Record<string, unknown>): string {
  let name = '';

  const {
    metadata,
  } = attributes;

  if (typeof metadata !== 'object' || metadata === null) {
    return name;
  }

  const {
    name: metadataName,
  } = metadata as Record<string, unknown>;

  if (typeof metadataName === 'string') {
    name = metadataName;
  }

  return name;
}
