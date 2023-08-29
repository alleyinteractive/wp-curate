import apiFetch from '@wordpress/api-fetch';
import { BlockControls, RichText, useBlockProps } from '@wordpress/block-editor';
import { Spinner, ToolbarDropdownMenu, ToolbarGroup } from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';
import './index.scss';
import {
  heading,
  headingLevel1,
  headingLevel2,
  headingLevel3,
  headingLevel4,
  headingLevel5,
  headingLevel6,
} from '@wordpress/icons';

interface EditProps {
  attributes: {
    level?: number,
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
    level = 2,
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

  // Get the heading icon based on level.
  const getHeadingLevelIcon = (selectedLevel: number = level) => {
    switch (selectedLevel) {
      case 1:
        return headingLevel1;
      case 2:
        return headingLevel2;
      case 3:
        return headingLevel3;
      case 4:
        return headingLevel4;
      case 5:
        return headingLevel5;
      case 6:
        return headingLevel6;
      default:
        return heading;
    }
  };

  return (
    <div {...useBlockProps()}>
      {fetchingHeading && !override
        ? (
          /* @ts-ignore */
          <Spinner />
        )
        : (
          <>
            {/* @ts-ignore */}
            <BlockControls>
              <ToolbarGroup>
                <ToolbarDropdownMenu
                  icon={getHeadingLevelIcon()}
                  label={__('Select a heading level', 'wp-curate')}
                  controls={[1, 2, 3, 4, 5, 6].map((targetLevel) => ({
                    icon: getHeadingLevelIcon(targetLevel),
                    // translators: %d: heading level e.g: "1", "2", "3"
                    label: sprintf(__('Heading %d', 'wp-curate'), targetLevel),
                    isActive: targetLevel === level,
                    onClick: () => setAttributes({ level: targetLevel }),
                  }))}
                />
              </ToolbarGroup>
            </BlockControls>
            <RichText
              /* @ts-ignore */
              tagName={`h${String(level)}`}
              allowedFormats={[]}
              value={override || dynamicHeading}
              onChange={(value) => setAttributes({ override: value })}
              placeholder={__('Heading', 'wp-curate')}
            />
          </>
        )}
    </div>
  );
}
