import type { CSSProperties, ReactNode } from "react";
import type { SupportedCssProperty } from "./cssPropertyMapping";

export type CSSVars = Record<string, string>;

export type Layer = {
	id: string;
	name: string;
	type: string;
	value: string;
	cssVars?: CSSVars;
	meta?: Record<string, unknown>;
	isLocked?: boolean;
	elementType?: string;
	children?: Layer[];
};

export type LayerWithStyles = Layer & {
	style: CSSProperties;
	contentStyle: CSSProperties;
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
