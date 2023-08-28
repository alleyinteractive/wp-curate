import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';

/**
 * The wp-curate/is-true block edit function.
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
