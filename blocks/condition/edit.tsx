import { __ } from '@wordpress/i18n';
import { InnerBlocks, InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
  PanelBody, PanelRow, SelectControl, TextControl,
} from '@wordpress/components';

import useParentBlock from '@/hooks/use-parent-block';

interface EditProps {
  attributes: {
    condition?: string;
    custom?: string;
    post?: string;
    query?: string;
    index?: object;
  };
  setAttributes: (attributes: any) => void;
  clientId: string;
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
  clientId,
}: EditProps) {
  const { name: parentBlock } = useParentBlock(clientId) as { name?: string };
  const [operator, compared] = Object.entries(index)[0];

  return (
    <>
      <div {...useBlockProps()}>
        <InnerBlocks
          allowedBlocks={['wp-curate/is-true', 'wp-curate/is-false']}
        />
      </div>

      <InspectorControls>
        <PanelBody
          title={__('Condition', 'the-wrap')}
          initialOpen
        >
          <PanelRow>
            <TextControl
              label={__('Query', 'wp-curate')}
              help={__('Query condition, ie "is_home" or "is_category"', 'wp-curate')}
              onChange={(next) => setAttributes({ query: next })}
              value={query}
            />
          </PanelRow>

          <PanelRow>
            <TextControl
              label={__('Post', 'wp-curate')}
              help={__('Post condition, ie "is_content"', 'wp-curate')}
              onChange={(next) => setAttributes({ post: next })}
              value={post}
            />
          </PanelRow>

          <PanelRow>
            <TextControl
              label={__('Custom', 'wp-curate')}
              help={__('Custom condition, ie "is_column"', 'wp-curate')}
              onChange={(next) => setAttributes({ custom: next })}
              value={custom}
            />
          </PanelRow>

          <PanelRow>
            <TextControl
              label={__('Condition', 'wp-curate')}
              help={__('Any other condition', 'wp-curate')}
              onChange={(next) => setAttributes({ condition: next })}
              value={condition}
            />
          </PanelRow>
        </PanelBody>

        { parentBlock === 'wp-curate/query' ? (
          <PanelBody
            title={__('Index Condition', 'the-wrap')}
          >
            <p>{__('Checks the index of how many times the parent condition block has been rendered, ie "Equals to 0", "Greater than 5"', 'wp-curate')}</p>

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

            <PanelRow>
              <TextControl
                label={__('Index compared', 'wp-curate')}
                onChange={(next) => setAttributes({ index: { [operator]: next } })}
                type="number"
                value={compared}
              />
            </PanelRow>
          </PanelBody>
        ) : null}
      </InspectorControls>
    </>
  );
}
