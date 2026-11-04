// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { InnerBlocks } from '@wordpress/block-editor';

/**
 * The wp-curate/single-post block save function.
 *
 * @return {WPElement} Element to render.
 */
export default function Save() {
  return (
    <InnerBlocks.Content />
  );
}
