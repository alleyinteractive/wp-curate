import apiFetch from '@wordpress/api-fetch';
import { RichText, useBlockProps } from '@wordpress/block-editor';
import { Spinner } from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import './index.scss';

interface EditProps {
  attributes: {
    override?: string;
  };
  context?: {
    heading?: {
      custom?: string | null;
      source?: string | null;
      taxonomy?: string | null;
      termId?: string | null;
    };
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
    heading: {
      custom = 'My Dynamic Heading',
      source = 'custom',
      taxonomy = null,
      termId = null,
    } = {},
  } = {},
  setAttributes,
}: EditProps) {
  const [dynamicHeading, setDynamicHeading] = useState('');
  const [fetchingHeading, setFetchingHeading] = useState(false);

  // Refresh dynamicHeading when the heading context changes.
  useEffect(() => {
    setFetchingHeading(true);
    apiFetch({
      path: `wp-curate/v1/query-heading?source=${source}&custom=${custom}&term_id=${termId}&taxonomy=${taxonomy}`,
    }).then((res) => {
      setDynamicHeading(res as any as string);
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
    }).finally(() => {
      setFetchingHeading(false);
    });
  }, [source, custom, termId, taxonomy]);

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
          />
        )}
    </div>
  );
}
