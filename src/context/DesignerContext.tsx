import { createContext, type ReactNode } from "react";
import { type Action, type State, useDesigner } from "../hooks/useDesigner";
import type { Breakpoint, CSSVars, Layer, LayerType } from "../lib/Types";

export const DesignerContext = createContext<{
	state: State;
	dispatch: React.Dispatch<Action>;
} | null>(null);

type DesignerProviderProps = {
	children: ReactNode;
	defaultLayers?: Layer[];
	layers?: Layer[];
	onLayersChange?: (layers: Layer[]) => void;
	frameSize?: { width: number; height: number };
	defaultLayerTypes?: LayerType[];
	breakpoints?: Breakpoint[];
	frameStyles?: CSSVars;
};

export const DesignerProvider = ({
	children,
	defaultLayers,
	layers,
	onLayersChange,
	frameSize,
	defaultLayerTypes,
	breakpoints,
	frameStyles,
}: DesignerProviderProps) => {
	const designer = useDesigner({
		defaultLayers,
		layers,
		onLayersChange,
		frameSize,
		layerTypes: defaultLayerTypes,
		breakpoints,
		frameStyles,
	});

	return (
		<DesignerContext.Provider value={designer}>
			{children}
		</DesignerContext.Provider>
	);
};
