import { createContext, type ReactNode, useMemo } from "react";
import { type Action, type State, useDesigner } from "../hooks/useDesigner";
import type { Breakpoint, CSSVars, Layer, LayerType } from "../lib/Types";

export const DesignerContext = createContext<{
	state: State;
	dispatch: React.Dispatch<Action>;
} | null>(null);

/**
 * Split contexts: the state context changes on every state update, the dispatch
 * context is stable. Dispatch-only consumers read the latter and never re-render
 * on state changes.
 */
export const DesignerStateContext = createContext<State | null>(null);
export const DesignerDispatchContext =
	createContext<React.Dispatch<Action> | null>(null);

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

	const { state, dispatch } = designer;
	const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);

	return (
		<DesignerDispatchContext.Provider value={dispatch}>
			<DesignerStateContext.Provider value={state}>
				<DesignerContext.Provider value={value}>
					{children}
				</DesignerContext.Provider>
			</DesignerStateContext.Provider>
		</DesignerDispatchContext.Provider>
	);
};
