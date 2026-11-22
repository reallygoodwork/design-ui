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

/**
 * What a layer type is, without how it renders: its defaults, what it can
 * hold, which properties it supports and its presets. Renderers live in the
 * UI package and extend this.
 */
export type LayerDefinition = {
	type: string;
	name: string;
	defaultValues: Omit<Layer, "id" | "type" | "children">;
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
	/**
	 * How the layer becomes HTML when a design is exported or rendered outside
	 * the editor. Without it, a layer exports as a div holding its children.
	 */
	html?: LayerHtml;
};

/** What a layer's element holds: other layers, its text, or nothing (an image or field). */
export type LayerHtml = {
	content: "children" | "text" | "image" | "input";
	/** Styles the editor's renderer adds, so exports match the canvas. */
	baseStyle?: Record<string, string>;
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
