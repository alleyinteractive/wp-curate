import { __ } from '@wordpress/i18n';
import ToolbarUrlSelector from '@/components/toolbar-url-selector';
import {
  useBlockProps,
  RichText,
  BlockControls,
} from '@wordpress/block-editor';

interface QueryLinkProps {
  attributes: {
    seeAllText: string;
    urlOverride: string;
  };
  isSelected: boolean;
  setAttributes: (new_value: any) => void;
}

/**
 * The wp-curate/query-link block edit function.
 *
 * @return {WPElement} Element to render.
 */
export default function Edit({
  attributes: {
    seeAllText,
    urlOverride,
  },
  isSelected,
  setAttributes,
}: QueryLinkProps) {
  return (
    <>
      <BlockControls>
        {/* @ts-ignore */}
        <ToolbarUrlSelector
          isSelected={isSelected}
          url={urlOverride}
          onChange={({ url }: { url: string }) => setAttributes({ urlOverride: url })}
          linkTitle={__('Override query URL', 'wp-curate')}
          editTitle={__('Edit query URL override', 'wp-curate')}
          settings={[]}
        />
      </BlockControls>

      <a {...useBlockProps()}>
        <RichText
          value={seeAllText || __('See All', 'wp-curate')}
          allowedFormats={[]}
          onChange={(value) => setAttributes({ seeAllText: value })}
        />
      </a>
    </>
  );
}
