// Global dependencies.
import React from 'react';

// Plugin dependencies.
import type { ChannelArgField } from '../../entries/block-editor/channelStore';

// Internal dependencies.
import TermControl from './term-control';

interface ChannelArgsControlsProps {
  args: Record<string, unknown>;
  fields: ChannelArgField[];
  onChange: (args: Record<string, unknown>) => void;
}

/**
 * A control for each argument that a channel reads, by the type of its field.
 *
 * A field of a type that the editor does not know has no control.
 */
export default function ChannelArgsControls({
  args,
  fields,
  onChange,
}: ChannelArgsControlsProps) {
  return (
    <>
      {fields.map(({
        id,
        label,
        taxonomy,
        type,
      }) => {
        let control = null;

        if (type === 'term' && typeof taxonomy === 'string') {
          control = (
            <TermControl
              key={id}
              label={label}
              onChange={(term) => onChange({ ...args, [id]: term })}
              taxonomy={taxonomy}
              value={args[id]}
            />
          );
        }

        return control;
      })}
    </>
  );
}
