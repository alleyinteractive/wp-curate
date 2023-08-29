import apiFetch from '@wordpress/api-fetch';
import { RichText, useBlockProps } from '@wordpress/block-editor';
import { Spinner } from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';
import './index.scss';

interface EditProps {
  attributes: {
    override?: string;
  };
  context?: {
    curation?: any; // Shape TBD.
  };
  setAttributes: (attributes: any) => void;
}

/**
 * The wp-curate/query block edit function.
 *
 * @return {WPElement} Element to render.
 */
export default function Edit({
  attributes: {
    override = '',
  },
  context: {
    curation = {},
  } = {},
  setAttributes,
}: EditProps) {
  const [dynamicHeading, setDynamicHeading] = useState('');
  const [fetchingHeading, setFetchingHeading] = useState(false);

  // Refresh dynamicHeading when the curation context changes.
  useEffect(() => {
    setFetchingHeading(true);
    apiFetch({
      path: addQueryArgs('wp-curate/v1/query-heading', { curation }),
    }).then((res) => {
      setDynamicHeading(res as any as string);
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      setDynamicHeading('');
    }).finally(() => {
      setFetchingHeading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div {...useBlockProps()}>
      {fetchingHeading && !override
        ? (
          /* @ts-ignore */
          <Spinner />
        )
        : (
          <RichText
            tagName="h2"
            allowedFormats={[]}
            value={override || dynamicHeading}
            onChange={(value) => setAttributes({ override: value })}
            placeholder={__('heading', 'wp-curate')}
          />
        )}
    </div>
  );
}
