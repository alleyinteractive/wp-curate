import { __ } from '@wordpress/i18n';
import { useBlockProps, RichText } from '@wordpress/block-editor';

/**
 * The wp-curate/query-link block edit function.
 *
 * @return {WPElement} Element to render.
 */
export default function Edit({
  attributes: {
    seeAllText,
  },
  setAttributes,
}) {
  return (
    <a {...useBlockProps()}>
        <RichText
          value={seeAllText || __('See All', 'wp-curate')}
          allowedFormats={[]}
          onChange={(value) => setAttributes({ seeAllText: value })}
        />
    </a>
  );
}
