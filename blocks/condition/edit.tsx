import { __ } from '@wordpress/i18n';
import { InnerBlocks, InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
  PanelBody, PanelRow, SelectControl, TextControl,
} from '@wordpress/components';

interface EditProps {
  attributes: {
    condition?: string;
    custom?: string;
    post?: string;
    query?: string;
    index?: object;
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
    index = { '': '' },
  },
  setAttributes,
}: EditProps) {
  const [operator, compared] = Object.entries(index)[0];

  return (
    <>
      <div {...useBlockProps()}>
        <InnerBlocks
          allowedBlocks={['wp-curate/is-true', 'wp-curate/is-false']}
        />
      </div>

      <InspectorControls>
        { /* @ts-ignore */ }
        <PanelBody
          title={__('Condition', 'the-wrap')}
          initialOpen
        >
          { /* @ts-ignore */ }
          <PanelRow>
            { /* @ts-ignore */ }
            <TextControl
              label={__('Query', 'wp-curate')}
              help={__('Query condition, ie "is_home" or "is_category"', 'wp-curate')}
              onChange={(next) => setAttributes({ query: next })}
              value={query}
            />
          </PanelRow>

          { /* @ts-ignore */ }
          <PanelRow>
            { /* @ts-ignore */ }
            <TextControl
              label={__('Post', 'wp-curate')}
              help={__('Post condition, ie "is_content"', 'wp-curate')}
              onChange={(next) => setAttributes({ post: next })}
              value={post}
            />
          </PanelRow>

          { /* @ts-ignore */ }
          <PanelRow>
            { /* @ts-ignore */ }
            <TextControl
              label={__('Custom', 'wp-curate')}
              help={__('Custom condition, ie "is_column"', 'wp-curate')}
              onChange={(next) => setAttributes({ custom: next })}
              value={custom}
            />
          </PanelRow>

          { /* @ts-ignore */ }
          <PanelRow>
            { /* @ts-ignore */ }
            <TextControl
              label={__('Condition', 'wp-curate')}
              help={__('Any other condition', 'wp-curate')}
              onChange={(next) => setAttributes({ condition: next })}
              value={condition}
            />
          </PanelRow>
        </PanelBody>

        { /* @ts-ignore */ }
        <PanelBody
          title={__('Index Condition', 'the-wrap')}
        >
          <p>{__('Checks the index of how many times the parent condition block has been rendered, ie "Equals to 0", "Greater than 5"', 'wp-curate')}</p>

          { /* @ts-ignore */ }
          <PanelRow>
            <SelectControl
              label={__('Index Operator', 'wp-curate')}
              value={operator}
              options={[
                { value: '', label: __('Select Operator', 'wp-curate') },
                { value: '===', label: __('Equal', 'wp-curate') },
                { value: '!==', label: __('Not equal', 'wp-curate') },
                { value: '>', label: __('Greater than', 'wp-curate') },
                { value: '<', label: __('Less than', 'wp-curate') },
                { value: '>=', label: __('Greater than or equal to', 'wp-curate') },
                { value: '<=', label: __('Less than or equal to', 'wp-curate') },
              ]}
              onChange={(next: string) => setAttributes({ index: { [next]: compared } })}
            />
          </PanelRow>

          { /* @ts-ignore */ }
          <PanelRow>
            { /* @ts-ignore */ }
            <TextControl
              label={__('Index compared', 'wp-curate')}
              onChange={(next) => setAttributes({ index: { [operator]: next } })}
              type="number"
              value={compared}
            />
          </PanelRow>
        </PanelBody>
      </InspectorControls>
    </>
  );
}
