import type { CSSProperties, ReactNode } from "react";
import type { SupportedCssProperty } from "./cssPropertyMapping";

export type CSSVars = Record<string, string>;

/**
 * Represents a breakpoint frame on the canvas (e.g., Mobile, Tablet, Desktop)
 */
export type Breakpoint = {
	id: string;
	name: string;
	width: number;
	height: number;
	position: { x: number; y: number }; // Position on infinite canvas
};

export type Layer = {
	id: string;
	name: string;
	type: string;
	value: string;
	cssVars?: CSSVars; // Base styles (smallest/primary breakpoint)
	breakpointCssVars?: {
		// Per-breakpoint overrides (larger breakpoints only)
		[breakpointId: string]: CSSVars; // Only stores EXPLICIT overrides, not inherited values
	};
	meta?: Record<string, unknown>;
	isLocked?: boolean;
	elementType?: string;
	children?: Layer[];
};

/**
 * A layer in the flat store: a Layer without `children`, linked by ids.
 * `childIds` mirrors `children`: absent when the layer had no `children`.
 */
export type LayerNode = Omit<Layer, "children"> & {
	parentId: string | null;
	childIds?: string[];
};

export type LayerWithStyles = Layer & {
	style: CSSProperties;
	effectiveCssVars: CSSVars;
};

export type LayerType = {
	type: string;
	name: string;
	defaultValues: Omit<Layer, "id" | "type" | "children">;
	render: (
		layer: LayerWithStyles,
		children?: React.ReactNode,
		elementType?: string
	) => React.ReactNode;
	icon?: ReactNode;
	keybinding?: Keybinding;
	supportsChildren?: boolean;
	supportedCssProperties?: SupportedCssProperty[];
	elementType?: string;
	availableElementTypes?: string[];
	/**
	 * Ready-made versions of this type listed in Add layer, such as a heading
	 * built from Text. Without presets, the type is listed once by its name.
	 */
	presets?: LayerPreset[];
	/** One line saying what the layer is for, shown in Add layer. */
	description?: string;
};

export type LayerPreset = {
	/** Unique within its layer type. */
	id: string;
	label: string;
	description: string;
	/** Heading under which Add layer lists it, e.g. "Layout" or "Text". */
	group: string;
	elementType?: string;
	/** Merged over the type's default values. */
	values?: Partial<Omit<Layer, "id" | "type" | "children">>;
	/** Extra words to match when searching, e.g. "title" for a heading. */
	keywords?: string[];
};

export type Keybinding = {
	key: string;
	label: string;
	labelMac: string;
	description: string;
	group: string;
};

export type FrameSize = {
	width: number;
	height: number;
	unit?: Unit;
};

type Unit = "px" | "mm" | "in" | "cm" | "pt";
