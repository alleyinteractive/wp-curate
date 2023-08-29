# ToolbarUrlSelector

This component adds ToolbarButtons for adding and removing a link, as well as the
Popover in which to select the URL.

## Usage

A basic example of how to use this component in a block that needs to select a URL.

```jsx
<ToolbarUrlSelector
  isSelected={isSelected}
  setAttributes={setAttributes}
  anchorRef={ref}
  url={url}
  linkTarget={linkTarget}
  onChange={onUrlSelectorChange}
/>
```
### Props

The set of props accepted by the component will be specified below.

**isSelected**

The `isSelected` block prop.

- Type: `Boolean`
- Required: Yes

**setAttributes**

The `setAttributes` block prop.

- Type: `Function`
- Required: Yes

**onChange**

Value change handler, accepts `{ url, opensInNewTab }`.

- Type: `Function`
- Required: Yes

**url**

The URL tracked by the parent block or component.

- Type: `String`
- Required: Yes

**settings**

An array of settings objects associated with a link (for example: a setting to determine whether or not the link opens in a new tab). Each object will be used to render a `ToggleControl` for that setting.

- Type: `Array`
- Required: No
- Default:
	```js
	[
	  {
	    id: 'opensInNewTab',
	    title: 'Open in new tab',
	  },
	]
	```

**linkTarget**

The link target tracked by the parent block or component.

- Type: `String`
- Required: No

**position**

The direction in which the popover should open relative to its parent node. Specify y- and x-axis as a space-separated string. Supports `"top"`, `"middle"`, `"bottom"` y axis, and `"left"`, `"center"`, `"right"` x axis.

- Type: `String`
- Required: No
- Default: `"bottom center"`

**anchorRef**

The ref for the element against which the `position` property will apply.

- Type: `Object`
- Required: No
