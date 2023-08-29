import { __ } from '@wordpress/i18n';
import { InnerBlocks, InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelRow, TextControl } from '@wordpress/components';

interface EditProps {
  attributes: {
    condition?: string;
    custom?: string;
    post?: string;
    query?: string;
    index?: string;
  };
  setAttributes: (attributes: any) => void;
}

/**
 * The wp-curate/condition block edit function.
 *
 * @return {WPElement} Element to render.
 */
export default function Edit({
  attributes: {
    condition = '',
    custom = '',
    post = '',
    query = '',
    index = '',
  },
  setAttributes,
}: EditProps) {
  return (
    <>
      <div {...useBlockProps()}>
        <InnerBlocks
          allowedBlocks={['wp-curate/is-true', 'wp-curate/is-false']}
        />
      </div>

      <InspectorControls>
        { /* @ts-ignore */ }
        <PanelRow>
          { /* @ts-ignore */ }
          <TextControl
            label={__('Query', 'wp-curate')}
            onChange={(next) => setAttributes({ query: next })}
            value={query}
          />
        </PanelRow>

        { /* @ts-ignore */ }
        <PanelRow>
          { /* @ts-ignore */ }
          <TextControl
            label={__('Index', 'wp-curate')}
            onChange={(next) => setAttributes({ index: next })}
            value={index}
          />
        </PanelRow>

        { /* @ts-ignore */ }
        <PanelRow>
          { /* @ts-ignore */ }
          <TextControl
            label={__('Post', 'wp-curate')}
            onChange={(next) => setAttributes({ post: next })}
            value={post}
          />
        </PanelRow>

        { /* @ts-ignore */ }
        <PanelRow>
          { /* @ts-ignore */ }
          <TextControl
            label={__('Custom', 'wp-curate')}
            onChange={(next) => setAttributes({ custom: next })}
            value={custom}
          />
        </PanelRow>

        { /* @ts-ignore */ }
        <PanelRow>
          { /* @ts-ignore */ }
          <TextControl
            label={__('Condition', 'wp')}
            onChange={(next) => setAttributes({ condition: next })}
            value={condition}
          />
        </PanelRow>
      </InspectorControls>
    </>
  );
}
