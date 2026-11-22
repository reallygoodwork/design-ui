import {
	type Action,
	createDesignerStore,
	type DesignerStore,
	denormalize,
	initialState,
	normalize,
	type Role,
	type Rule,
	type State,
} from "@design-ui/core";
import { useEffect, useRef, useSyncExternalStore } from "react";
import type { Breakpoint, CSSVars, Layer, LayerType } from "../lib/Types";

// The editor's state and actions come from the core package.
export type { Action, DesignerStore, State };

type UseDesignerProps = {
	/**
	 * The initial layers for uncontrolled mode.
	 */
	defaultLayers?: Layer[];
	/**
	 * The current layers for controlled mode.
	 */
	layers?: Layer[];
	/**
	 * The default layer types for the designer.
	 */
	layerTypes?: LayerType[];
	/**
	 * Callback for when the layers change in controlled mode.
	 */
	onLayersChange?: (layers: Layer[]) => void;
	/**
	 * The initial breakpoints (responsive frames).
	 */
	breakpoints?: Breakpoint[];
	/**
	 * Shared document-level styles.
	 */
	frameStyles?: CSSVars;
	/** The editing rules to start with. */
	rules?: Rule[];
	/** Who is editing. Builders aren't limited by rules. Defaults to builder. */
	role?: Role;
};

/**
 * The core hook for the designer state management.
 */
export const useDesigner = ({
	defaultLayers,
	layers,
	onLayersChange,
	layerTypes,
	breakpoints,
	frameStyles,
	rules,
	role = "builder",
}: UseDesignerProps) => {
	const initialBreakpoints: Breakpoint[] = breakpoints ?? [];

	const storeRef = useRef<DesignerStore | null>(null);
	if (!storeRef.current) {
		storeRef.current = createDesignerStore({
			...initialState,
			...normalize(defaultLayers || layers || []),
			layerTypes: layerTypes || [],
			breakpoints: initialBreakpoints,
			activeBreakpointId: initialBreakpoints[0]?.id ?? null,
			frameStyles: frameStyles ?? {},
			rules: rules ?? [],
			role,
		});
	}
	const store = storeRef.current;
	const { dispatch } = store;
	const state = useSyncExternalStore(store.subscribe, store.getState);

	useEffect(() => {
		dispatch({ type: "SET_ROLE", payload: role });
	}, [role, dispatch]);

	useEffect(() => {
		if (layers) {
			dispatch({ type: "SET_LAYERS", payload: layers });
		}
	}, [layers, dispatch]);

	const nestedLayers = denormalize(state.nodes, state.rootIds);
	useEffect(() => {
		if (onLayersChange) {
			onLayersChange(nestedLayers);
		}
	}, [nestedLayers, onLayersChange]);

	return { state, dispatch, store };
};
