// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { TextControl } from '@wordpress/components';
import { useDebounce } from '@wordpress/compose';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from '@wordpress/element';

/**
 * The control of the search argument of the Free-For-All channel.
 *
 * Each change of an argument loads the channel again, so the control saves the text only after
 * typing stops.
 */
export default function DebouncedTextControl({
  help,
  label,
  onChange,
  value,
}: {
  help: string;
  label: string;
  onChange: (text: string) => void;
  value: unknown;
}) {
  let saved = '';

  if (typeof value === 'string') {
    saved = value;
  }

  const [text, setText] = useState(saved);

  // The text that the control saved last, so that only a change from elsewhere replaces the text.
  const lastSaved = useRef(saved);

  // The latest `onChange`, so that the debounced function stays the same between renders.
  const latestOnChange = useRef(onChange);

  latestOnChange.current = onChange;

  const saveNow = useCallback((next: string) => {
    lastSaved.current = next;
    latestOnChange.current(next);
  }, []);

  const save = useDebounce(saveNow, 500);

  // Save pending text when the control closes.
  useEffect(() => () => save.flush(), [save]);

  // A change from elsewhere, such as "Reset all", replaces the text.
  useEffect(() => {
    if (saved !== lastSaved.current) {
      lastSaved.current = saved;
      setText(saved);
    }
  }, [saved]);

  return (
    <TextControl
      __next40pxDefaultSize
      __nextHasNoMarginBottom
      help={help}
      label={label}
      onChange={(next) => {
        setText(next);
        save(next);
      }}
      value={text}
    />
  );
}
