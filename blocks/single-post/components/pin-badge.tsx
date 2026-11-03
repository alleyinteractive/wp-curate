// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { __ } from '@wordpress/i18n';
import { Icon, pin } from '@wordpress/icons';

/**
 * The mark of a block that has pinned a post: a pin icon in the top right corner, and the word
 * "Scheduled" when the pinned post is scheduled.
 *
 * The block's toolbar tells screen reader users that the block has a pin, so the mark is hidden
 * from them.
 */
export default function PinBadge({
  isScheduled,
}: {
  isScheduled: boolean;
}) {
  return (
    <span aria-hidden="true" className="wp-curate-single-post__pin-badge">
      <Icon icon={pin} size={20} />

      {isScheduled ? (
        <span className="wp-curate-single-post__pin-badge-text">
          {__('Scheduled', 'wp-curate')}
        </span>
      ) : null}
    </span>
  );
}
