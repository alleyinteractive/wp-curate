import { registerBlockType } from '@wordpress/blocks';
import { addFilter } from '@wordpress/hooks';
import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';
import {
  postDate,
  postExcerpt,
  postFeaturedImage,
  list as listIcon,
} from '@wordpress/icons';

import edit from './edit';
import metadata from './block.json';

import './style.scss';

// PHP-registered block variations use dashicon strings which don't load inside the
// apiVersion 3 iframe. Override them here with inline SVGs from @wordpress/icons.
const VARIATION_ICONS: Record<string, JSX.Element> = {
  'wp-curate/title-date': postDate,
  'wp-curate/title-excerpt': postExcerpt,
  'wp-curate/title-date-excerpt': listIcon,
  'wp-curate/image-date-title': postFeaturedImage,
};

addFilter(
  'blocks.registerBlockType',
  'wp-curate/query-variation-icons',
  (settings: { variations?: Array<{ name: string; [key: string]: unknown }> }, name: string) => {
    if (name !== 'wp-curate/query' || !Array.isArray(settings.variations)) {
      return settings;
    }
    return {
      ...settings,
      variations: settings.variations.map((variation) => ({
        ...variation,
        icon: VARIATION_ICONS[variation.name] ?? variation.icon,
      })),
    };
  }
);

/* @ts-expect-error Provided types are inaccurate to the actual plugin API. */
registerBlockType(metadata, {
  edit,
  save: () => {
    const blockProps = useBlockProps.save();
    return (
      <div {...blockProps}>
        {/* @ts-ignore */}
        <InnerBlocks.Content />
      </div>
    );
  },
});
