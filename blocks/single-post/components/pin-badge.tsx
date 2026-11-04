// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { VisuallyHidden } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { Icon, pin } from '@wordpress/icons';

/**
 * The mark of a block that has pinned a post: a pin icon in the top right corner, and text about
 * the pinned post, such as "Scheduled", if there is any.
 *
 * The block's toolbar tells screen reader users that the block has a pin, so the icon is hidden
 * from them. They get the text in a separate element, which stays while the block is selected,
 * because the visible mark goes away then.
 */
export default function PinBadge({
  text,
}: {
  text: string;
}) {
  /* translators: %s: Status of the pinned post, such as "Draft". */
  const spokenText = sprintf(__('Pinned post: %s', 'wp-curate'), text);

  return (
    <>
      <span aria-hidden="true" className="wp-curate-single-post__pin-badge">
        <Icon icon={pin} size={20} />

        {text !== '' ? (
          <span className="wp-curate-single-post__pin-badge-text">
            {text}
          </span>
        ) : null}
      </span>

      {text !== '' ? (
        <VisuallyHidden as="span">
          {spokenText}
        </VisuallyHidden>
      ) : null}
    </>
  );
}
