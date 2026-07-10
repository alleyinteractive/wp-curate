import { registerBlockType } from '@wordpress/blocks';
import { addFilter } from '@wordpress/hooks';
import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';
import { listView } from '@wordpress/icons';

import edit from './edit';
import metadata from './block.json';

import './style.scss';

// PHP-registered block variations use the 'list-view' dashicon string which doesn't
// load inside the apiVersion 3 iframe. Override with the equivalent SVG from @wordpress/icons.
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
        icon: listView,
      })),
    };
  },
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
