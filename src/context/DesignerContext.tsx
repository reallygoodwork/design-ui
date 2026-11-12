import { createContext, type ReactNode } from "react";
import { type DesignerStore, useDesigner } from "../hooks/useDesigner";
import type { Breakpoint, CSSVars, Layer, LayerType } from "../lib/Types";

/**
 * The context value is the stable store, so it never changes and never
 * re-renders consumers. Components subscribe through `useDesignerSelector`.
 */
export const DesignerContext = createContext<DesignerStore | null>(null);

type DesignerProviderProps = {
	children: ReactNode;
	defaultLayers?: Layer[];
	layers?: Layer[];
	onLayersChange?: (layers: Layer[]) => void;
	defaultLayerTypes?: LayerType[];
	breakpoints?: Breakpoint[];
	frameStyles?: CSSVars;
};

export const DesignerProvider = ({
	children,
	defaultLayers,
	layers,
	onLayersChange,
	defaultLayerTypes,
	breakpoints,
	frameStyles,
}: DesignerProviderProps) => {
	const designer = useDesigner({
		defaultLayers,
		layers,
		onLayersChange,
		layerTypes: defaultLayerTypes,
		breakpoints,
		frameStyles,
	});

	return (
		<DesignerContext.Provider value={designer.store}>
			{children}
		</DesignerContext.Provider>
	);
};
