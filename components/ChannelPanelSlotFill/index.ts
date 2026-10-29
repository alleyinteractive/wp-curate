// WordPress dependencies.
import { createSlotFill } from '@wordpress/components';

// Plugin dependencies.
import type { ChannelArgField } from '../../entries/block-editor/channelStore';

/**
 * The props that the Channel panel gives each fill.
 */
export interface ChannelPanelFillProps {
  /**
   * The descriptions of the arguments that the channel accepts, keyed by argument name, from
   * `Channel::args()`.
   */
  argFields: Record<string, ChannelArgField>;
  /** The block's arguments for the channel. */
  args: Record<string, unknown>;
  /** The name of the block type. */
  blockName: string;
  /** The name of the block's channel. */
  channel: string;
  /** The block's client ID, which is also the `panelId` of the panel. */
  clientId: string;
  /** Saves new arguments for the channel. */
  setArgs: (args: Record<string, unknown>) => void;
}

/*
 * The Channel panel of a block is a ToolsPanel with a slot for the controls of channel arguments.
 * A fill gets `ChannelPanelFillProps` and adds a ToolsPanelItem with `clientId` as its `panelId`
 * for each argument that it handles. A fill handles the arguments of its own channels, found by
 * the channel name, and finds each argument by its name. A ToolsPanelItem `label` must be unique
 * in the panel. Its `resetAllFilter` gets the arguments and returns them without its value.
 *
 * The channel accepts only the arguments in its `args()`, so a fill cannot add others. A plugin
 * outside WP Curate adds a channel with the `wp_curate_channels` filter in PHP and fills the slot
 * by its name, such as with `<wp.components.Fill name="WPCurateChannelPanel">` from a plugin that
 * `registerPlugin()` adds. WP Curate adds the controls of its own channels the same way, such as
 * in `entries/block-editor/freeForAllArgs`.
 */
export const {
  Fill: ChannelPanelFill,
  Slot: ChannelPanelSlot,
} = createSlotFill('WPCurateChannelPanel');
