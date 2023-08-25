import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';

import './index.scss';

/**
 * The wp-curate/query block edit function.
 *
 * @return {WPElement} Element to render.
 */
export default function Edit() {
  return (
    <div {...useBlockProps()}>
      <InnerBlocks />
    </div>
  );
}
