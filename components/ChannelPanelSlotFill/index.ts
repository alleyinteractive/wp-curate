// WordPress dependencies.
import { createSlotFill } from '@wordpress/components';

// Plugin dependencies.
import type { ChannelArgField } from '../../entries/block-editor/channelStore';

/**
 * The props that the Channel panel gives each fill.
 *
 * - `argFields`: The fields of the arguments that the channel reads, from `Channel::arg_fields()`.
 * - `args`: The block's arguments for the channel.
 * - `blockName`: The name of the block type.
 * - `channel`: The name of the block's channel.
 * - `clientId`: The block's client ID, which is also the `panelId` of the panel.
 * - `setArgs`: Saves new arguments for the channel.
 */
export interface ChannelPanelFillProps {
  argFields: ChannelArgField[];
  args: Record<string, unknown>;
  blockName: string;
  channel: string;
  clientId: string;
  setArgs: (args: Record<string, unknown>) => void;
}

/*
 * The Channel panel of a block is a ToolsPanel with a slot for the controls of channel arguments.
 * A fill gets `ChannelPanelFillProps` and adds a ToolsPanelItem with `clientId` as its `panelId`
 * for each argument that it handles, usually by the field `type`. A ToolsPanelItem `label` must be
 * unique in the panel. Its `resetAllFilter` gets the arguments and returns them without its value.
 *
 * The channel reads only the arguments in its fields, so a fill cannot add others. A plugin outside
 * WP Curate adds a channel with the `wp_curate_channels` filter in PHP, gives its fields a type
 * with a prefix, and fills the slot by its name, such as with
 * `<wp.components.Fill name="WPCurateChannelPanel">` from a plugin that `registerPlugin()` adds.
 * WP Curate adds its own term picker the same way, in `entries/block-editor/channelTermArgs`.
 */
export const {
  Fill: ChannelPanelFill,
  Slot: ChannelPanelSlot,
} = createSlotFill('WPCurateChannelPanel');
