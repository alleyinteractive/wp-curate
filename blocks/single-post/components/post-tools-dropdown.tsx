// Global dependencies.
import React from 'react';

// WordPress dependencies.
import {
  DropdownMenu,
  MenuGroup,
  MenuItem,
  ToolbarItem,
  VisuallyHidden,
} from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { chevronDown, external, pin } from '@wordpress/icons';
import { addQueryArgs } from '@wordpress/url';

const POPOVER_PROPS = {
  placement: 'bottom-start',
} as const;

/**
 * A dropdown in the block toolbar with "Pin this post", "Edit post", and "View post", for the post
 * that the block shows. It follows the "More" dropdown of the rich text formatting toolbar.
 *
 * "Pin this post" shows only if `onPin` is a function. "Edit post" and "View post" open in a new
 * tab, so that the post that the user is editing stays open. "Edit post" shows only if the user can
 * edit the post. The dropdown shows only while the block shows a post.
 */
export default function PostToolsDropdown({
  onPin,
  postId,
  postType,
}: {
  onPin: ((id: number, type: string) => void) | null;
  postId: number | null;
  postType: string;
}) {
  const hasPost = postId !== null && postId > 0 && postType !== '';

  const {
    canEdit,
    link,
  } = useSelect((select) => {
    const {
      canUser,
      getEntityRecord,
    } = select(coreStore) as any;

    let outCanEdit = false;
    let outLink = '';

    if (hasPost) {
      outCanEdit = canUser('update', { id: postId, kind: 'postType', name: postType }) === true;

      // Users who can't edit can usually still see the view context.
      const record = getEntityRecord('postType', postType, postId, { _fields: 'id,link', context: 'view' });

      if (typeof record === 'object' && record !== null && typeof record.link === 'string') {
        outLink = record.link;
      }
    }

    return {
      canEdit: outCanEdit,
      link: outLink,
    };
  }, [hasPost, postId, postType]);

  const opensInNewTab = (
    <VisuallyHidden as="span">
      {__('(opens in a new tab)', 'wp-curate')}
    </VisuallyHidden>
  );

  let out = null;

  if (hasPost && postId !== null) {
    out = (
      <ToolbarItem>
        {(toggleProps) => (
          <DropdownMenu
            icon={chevronDown}
            /* translators: button label text should, if possible, be under 16 characters. */
            label={__('More', 'wp-curate')}
            popoverProps={POPOVER_PROPS}
            toggleProps={{
              ...toggleProps,
              description: __('Displays more post tools', 'wp-curate'),
            }}
          >
            {({ onClose }) => (
              <MenuGroup>
                {onPin !== null ? (
                  <MenuItem
                    icon={pin}
                    onClick={() => {
                      onPin(postId, postType);
                      onClose();
                    }}
                  >
                    {__('Pin this post', 'wp-curate')}
                  </MenuItem>
                ) : null}

                {canEdit ? (
                  <MenuItem
                    // @ts-expect-error href, rel, and target not available in types yet.
                    href={addQueryArgs('post.php', { action: 'edit', post: postId })}
                    icon={external}
                    onClick={onClose}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {__('Edit post', 'wp-curate')}
                    {opensInNewTab}
                  </MenuItem>
                ) : null}

                {link !== '' ? (
                  <MenuItem
                    // @ts-expect-error href, rel, and target not available in types yet.
                    href={link}
                    icon={external}
                    onClick={onClose}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {__('View post', 'wp-curate')}
                    {opensInNewTab}
                  </MenuItem>
                ) : null}
              </MenuGroup>
            )}
          </DropdownMenu>
        )}
      </ToolbarItem>
    );
  }

  return out;
}
