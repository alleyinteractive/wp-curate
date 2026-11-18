// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { InnerBlocks } from '@wordpress/block-editor';

/**
 * The wp-curate/channel-loop block save function.
 *
 * @return {WPElement} Element to render.
 */
export default function Save() {
  return (
    <InnerBlocks.Content />
  );
}
