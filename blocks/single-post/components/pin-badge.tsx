// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { Icon, pin } from '@wordpress/icons';

/**
 * The mark of a block that has pinned a post: a pin icon in the top right corner, and text about
 * the pinned post, such as "Scheduled", if there is any.
 *
 * The block's toolbar tells screen reader users that the block has a pin, so the mark is hidden
 * from them.
 */
export default function PinBadge({
  text,
}: {
  text: string;
}) {
  return (
    <span aria-hidden="true" className="wp-curate-single-post__pin-badge">
      <Icon icon={pin} size={20} />

      {text !== '' ? (
        <span className="wp-curate-single-post__pin-badge-text">
          {text}
        </span>
      ) : null}
    </span>
  );
}
