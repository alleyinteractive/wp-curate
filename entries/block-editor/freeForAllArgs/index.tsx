// Global dependencies.
import React from 'react';

// WordPress dependencies.
import { Checkboxes } from '@alleyinteractive/block-editor-tools';
import {
  __experimentalToolsPanelItem as ToolsPanelItem,
  SelectControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

// Plugin dependencies.
import { ChannelPanelFill } from '../../../components/ChannelPanelSlotFill';
import type { ChannelPanelFillProps } from '../../../components/ChannelPanelSlotFill';
import DebouncedTextControl from '../../../components/DebouncedTextControl';
import TermControl from '../../../components/TermControl';
import type { ChannelArgField } from '../channelStore';

interface FieldOption {
  label: string;
  value: string;
}

/**
 * Get the arguments without one of them.
 *
 * @param args The arguments.
 * @param id   The key of the argument to leave out.
 */
function withoutArg(args: Record<string, unknown>, id: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(args).filter(([key]) => key !== id));
}

/**
 * Whether an argument has a nonempty value.
 *
 * @param value The argument.
 */
function hasArgValue(value: unknown): boolean {
  return value !== undefined
    && value !== null
    && value !== ''
    && !(Array.isArray(value) && value.length === 0);
}

/**
 * Reads the `options` of an argument's description: a list of labels and values.
 *
 * @param field The argument's description.
 */
function toFieldOptions(field: ChannelArgField): FieldOption[] {
  const options: FieldOption[] = [];

  const {
    options: fieldOptions,
  } = field;

  if (!Array.isArray(fieldOptions)) {
    return options;
  }

  fieldOptions.forEach((option: unknown) => {
    if (typeof option !== 'object' || option === null) {
      return;
    }

    const {
      label,
      value,
    } = option as Record<string, unknown>;

    if (typeof label === 'string' && typeof value === 'string') {
      options.push({ label, value });
    }
  });

  return options;
}

/**
 * Reads the strings in a list argument.
 *
 * @param value The argument.
 */
function toStrings(value: unknown): string[] {
  let strings: string[] = [];

  if (Array.isArray(value)) {
    strings = value.filter((item): item is string => typeof item === 'string');
  }

  return strings;
}

/**
 * A panel item for each argument of the Free-For-All channel.
 * A required argument always displays. The others are in the panel's menu.
 */
function FreeForAllArgItems({
  argFields,
  args,
  channel,
  clientId,
  setArgs,
}: ChannelPanelFillProps) {
  return channel === 'free_for_all' ? (
    <>
      {Object.entries(argFields).map(([id, field]) => {
        const {
          help: fieldHelp,
          label,
          required,
          taxonomy,
        } = field;

        const value = args[id];

        let help = '';

        if (typeof fieldHelp === 'string') {
          help = fieldHelp;
        }

        if (required && !hasArgValue(value)) {
          help = __('This field is required.', 'wp-curate');
        }

        if (id === 'meta_key' && args.orderby !== 'meta_value') {
          return null;
        }

        /**
         * Saves the arguments with this one changed, or without it when given undefined. A meta key
         * applies only to ordering by a meta value, so another order removes it.
         *
         * @param next The argument.
         */
        const setArg = (next: unknown) => {
          let nextArgs = next === undefined ? withoutArg(args, id) : { ...args, [id]: next };

          if (id === 'orderby' && next !== 'meta_value') {
            nextArgs = withoutArg(nextArgs, 'meta_key');
          }

          setArgs(nextArgs);
        };

        // The control of the argument, by its name, or null for an argument that the channel does
        // not have.
        let control: React.ReactElement | null = null;

        if (id === 'post_types') {
          control = (
            <>
              <Checkboxes
                label={label}
                onChange={(next: string[]) => setArg(next.length > 0 ? next : undefined)}
                options={toFieldOptions(field)}
                value={toStrings(value)}
              />
              {help !== '' ? <p className="components-base-control__help">{help}</p> : null}
            </>
          );
        }

        // Each taxonomy that the channel allows is an argument with a `taxonomy` key.
        if (typeof taxonomy === 'string') {
          control = (
            <TermControl
              help={help}
              label={label}
              multiple
              onChange={(ids) => setArg(ids.length > 0 ? ids : undefined)}
              taxonomy={taxonomy}
              value={value}
            />
          );
        }

        if (id === 'tax_relation' || id === 'orderby' || id === 'meta_key' || id === 'order') {
          control = (
            <SelectControl
              __next40pxDefaultSize
              __nextHasNoMarginBottom
              help={help}
              label={label}
              onChange={(next) => setArg(next !== '' ? next : undefined)}
              options={toFieldOptions(field)}
              value={typeof value === 'string' ? value : undefined}
            />
          );
        }

        if (id === 'search') {
          control = (
            <DebouncedTextControl
              help={help}
              label={label}
              onChange={(next) => setArg(next !== '' ? next : undefined)}
              value={value}
            />
          );
        }

        if (control === null) {
          return null;
        }

        return (
          <ToolsPanelItem
            hasValue={() => hasArgValue(value)}
            isShownByDefault={required}
            key={id}
            label={label}
            onDeselect={() => setArg(undefined)}
            panelId={clientId}
            resetAllFilter={(next: Record<string, unknown>) => withoutArg(next, id)}
          >
            {control}
          </ToolsPanelItem>
        );
      })}
    </>
  ) : null;
}

/**
 * Adds the controls of the Free-For-All channel's arguments to the Channel panel through its slot,
 * the way that other plugins can add controls for their own channels.
 */
export default function FreeForAllArgs() {
  return (
    <ChannelPanelFill>
      {(fillProps) => <FreeForAllArgItems {...(fillProps as ChannelPanelFillProps)} />}
    </ChannelPanelFill>
  );
}
