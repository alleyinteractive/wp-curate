import PropTypes from 'prop-types';
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import {
  ToolbarButton,
  Popover,
} from '@wordpress/components';
import {
  BlockControls,
  __experimentalLinkControl as LinkControl,
} from '@wordpress/block-editor';
import {
  link as linkIcon,
  globe as editIcon,
} from '@wordpress/icons';

/**
 * Presents toolbar buttons for adding and removing a link, along with the Popover
 * for managing link attributes.
 */
function ToolbarUrlSelector({
  anchorRef,
  editTitle,
  isSelected,
  linkTarget,
  linkTitle,
  onChange,
  position,
  settings,
  url,
}) {
  const [isEditingLink, setIsEditingLink] = useState(false);
  const isLinkSet = Boolean(url);
  const opensInNewTab = (linkTarget === '_blank');

  /**
   * Toggles link editing state to trigger the LinkControl Popup.
   *
   * @param {Event} event The Event object.
   */
  const toggleEditing = (event) => {
    event.preventDefault();
    setIsEditingLink((editing) => !editing);
  };

  /**
   * Remove link-related attributes and close the LinkControl Popup.
   */
  const onRemove = () => {
    onChange({
      url: undefined,
      opensInNewTab: undefined,
    });

    setIsEditingLink(false);
    anchorRef?.current?.focus();
  };

  return (
    <>
      <BlockControls group="block">
        {isLinkSet
          ? (
            <ToolbarButton
              name="edit"
              icon={editIcon}
              title={editTitle || __('Edit', 'wp-curate')}
              onClick={toggleEditing}
            />
          )
          : (
            <ToolbarButton
              name="link"
              icon={linkIcon}
              title={linkTitle || __('Link', 'wp-curate')}
              onClick={toggleEditing}
            />
          )}
      </BlockControls>

      {isSelected && isEditingLink
        ? (
          <Popover
            position={position || 'bottom center'}
            onClose={() => {
              setIsEditingLink(false);
              anchorRef?.current?.focus();
            }}
            anchorRef={anchorRef?.current}
            focusOnMount={isEditingLink ? 'firstElement' : false}
          >
            <LinkControl
              className="wp-block-navigation-link__inline-link-input"
              value={{ url, opensInNewTab }}
              onChange={onChange}
              onRemove={onRemove}
              forceIsEditingLink={!isLinkSet}
              settings={settings}
            />
          </Popover>
        )
        : null}
    </>
  );
}

ToolbarUrlSelector.defaultProps = {
  editTitle: null,
  linkTarget: '',
  linkTitle: null,
  position: 'bottom center',
  settings: [
    {
      id: 'opensInNewTab',
      title: 'Open in new tab',
    },
  ],
};

ToolbarUrlSelector.propTypes = {
  anchorRef: PropTypes.shape({
    current: PropTypes.element,
  }).isRequired,
  editTitle: PropTypes.string,
  isSelected: PropTypes.bool.isRequired,
  linkTarget: PropTypes.string,
  linkTitle: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  position: PropTypes.string,
  settings: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      title: PropTypes.string,
    }),
  ),
  url: PropTypes.string.isRequired,
};

export default ToolbarUrlSelector;
