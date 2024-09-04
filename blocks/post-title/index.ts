import { registerBlockType } from '@wordpress/blocks';
import { title as icon } from '@wordpress/icons';

import edit from './edit';
import metadata from './block.json';

/* @ts-expect-error Provided types are inaccurate to the actual plugin API. */
registerBlockType(metadata, { icon, edit });
