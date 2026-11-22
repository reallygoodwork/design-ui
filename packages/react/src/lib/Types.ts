import type { CSSVars, Layer, LayerDefinition } from "@design-ui/core";
import type { CSSProperties, ReactNode } from "react";

export type {
	Breakpoint,
	CSSVars,
	Keybinding,
	Layer,
	LayerDefinition,
	LayerNode,
	LayerPreset,
} from "@design-ui/core";

export type LayerWithStyles = Layer & {
	style: CSSProperties;
	effectiveCssVars: CSSVars;
};

/** A layer definition plus how the editor renders and shows it. */
export type LayerType = LayerDefinition & {
	render: (
		layer: LayerWithStyles,
		children?: ReactNode,
		elementType?: string
	) => ReactNode;
	icon?: ReactNode;
};
