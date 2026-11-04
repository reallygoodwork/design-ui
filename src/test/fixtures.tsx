import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { DesignerProvider } from "../context/DesignerContext";
import { frameLayerType } from "../lib/layers/frame";
import { imageLayerType } from "../lib/layers/image";
import { textLayerType } from "../lib/layers/text";
import type { Breakpoint, Layer, LayerType } from "../lib/Types";

/**
 * The layer types `Designer` registers by default.
 */
export const defaultLayerTypes: LayerType[] = [
	textLayerType,
	imageLayerType,
	frameLayerType,
];

/**
 * Build a minimal layer for tests. Defaults to a frame so it can hold children.
 */
export const makeLayer = (
	id: string,
	children?: Layer[],
	overrides: Partial<Layer> = {}
): Layer => ({
	id,
	name: id,
	type: "frame",
	value: "",
	...(children && { children }),
	...overrides,
});

/**
 * The breakpoints used by the demo app in `App.tsx`.
 */
export const breakpoints: Breakpoint[] = [
	{
		id: "mobile",
		name: "Mobile",
		width: 375,
		height: 667,
		position: { x: 0, y: 0 },
	},
	{
		id: "tablet",
		name: "Tablet",
		width: 768,
		height: 1024,
		position: { x: 425, y: 0 },
	},
	{
		id: "desktop",
		name: "Desktop",
		width: 1440,
		height: 900,
		position: { x: 1243, y: 0 },
	},
];

/**
 * Render UI inside a `DesignerProvider` with the default layer types.
 */
export const renderInDesigner = (
	ui: ReactNode,
	options: { layers?: Layer[]; breakpoints?: Breakpoint[] } = {}
) =>
	render(
		<DesignerProvider
			defaultLayers={options.layers ?? []}
			defaultLayerTypes={defaultLayerTypes}
			breakpoints={options.breakpoints ?? breakpoints}
		>
			{ui}
		</DesignerProvider>
	);
