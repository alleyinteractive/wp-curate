// WordPress dependencies.
import { registerBlockType } from '@wordpress/blocks';
import { stack as icon } from '@wordpress/icons';

// Internal dependencies.
import metadata from './block.json';
import edit from './edit';
import save from './save';

/* @ts-expect-error Provided types are inaccurate to the actual plugin API. */
registerBlockType(metadata, { edit, icon, save });
