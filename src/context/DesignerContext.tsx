import { createContext, type ReactNode } from "react";
import { type Action, type State, useDesigner } from "../hooks/useDesigner";
import type { Layer, LayerType } from "../lib/Types";

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
};

export const DesignerProvider = ({
	children,
	defaultLayers,
	layers,
	onLayersChange,
	frameSize,
	defaultLayerTypes,
}: DesignerProviderProps) => {
	const designer = useDesigner({
		defaultLayers,
		layers,
		onLayersChange,
		frameSize,
		layerTypes: defaultLayerTypes,
	});

	return (
		<DesignerContext.Provider value={designer}>
			{children}
		</DesignerContext.Provider>
	);
};
