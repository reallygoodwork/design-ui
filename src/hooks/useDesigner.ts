import { useEffect, useReducer } from "react";
import { isPrimaryBreakpoint } from "../lib/breakpointUtils";
import type { Breakpoint, CSSVars, Layer, LayerType } from "../lib/Types";

/**
 * The state of the designer.
 */
export type State = {
	/**
	 * The layers in the designer.
	 */
	layers: Layer[];
	/**
	 * The available layer types.
	 */
	layerTypes: LayerType[];
	/**
	 * The IDs of the selected layers.
	 */
	selectedLayers: string[];
	/**
	 * All breakpoints (responsive frames).
	 */
	breakpoints: Breakpoint[];
	/**
	 * The currently active breakpoint for editing.
	 */
	activeBreakpointId: string | null;
	/**
	 * The selected breakpoint frame (when frame itself is selected, not a layer).
	 * Mutually exclusive with selectedLayers.
	 */
	selectedBreakpointId: string | null;
	/**
	 * Shared document-level styles (like body styles, apply to all breakpoints).
	 */
	frameStyles: CSSVars;
	/**
	 * The history of the designer state.
	 */
	history: State[];
	/**
	 * The current index in the history.
	 */
	historyIndex: number;
	/**
	 * The zoom level of the canvas.
	 */
	zoom: number;
	/**
	 * The pan offset of the canvas.
	 */
	pan: { x: number; y: number };
	/**
	 * @deprecated Use breakpoints instead
	 * The size of the frame.
	 */
	frameSize?: { width: number; height: number };
	/**
	 * The add layer dialog state.
	 */
	addLayerDialog?: {
		open: boolean;
		layerId: string;
		position: "before" | "inside" | "after";
	};
	/**
	 * Counter to trigger re-centering on breakpoints.
	 * When this changes, DesignerCanvas will center on all frames.
	 */
	centerRequestId: number;
};

/**
 * The actions that can be dispatched to update the designer state.
 */
export type Action =
	| {
			type: "ADD_LAYER";
			payload: {
				layer: Layer;
				targetLayerId: string;
				position: "before" | "inside" | "after";
			};
	  }
	| {
			type: "SELECT_LAYER";
			payload: { layerId: string; shiftKey: boolean; breakpointId?: string };
	  }
	| { type: "DESELECT_ALL" }
	| {
			type: "UPDATE_LAYER_CSS";
			payload: {
				id: string;
				css: Record<string, string>;
				breakpointId?: string; // If provided, updates breakpoint-specific styles
			};
	  }
	| {
			type: "UPDATE_LAYER_VALUE";
			payload: {
				id: string;
				value: string;
			};
	  }
	| {
			type: "UPDATE_LAYER_NAME";
			payload: {
				layerId: string;
				name: string;
			};
	  }
	| {
			type: "UPDATE_LAYER_LOCK";
			payload: {
				layerId: string;
				isLocked: boolean;
			};
	  }
	| {
			type: "UPDATE_LAYER_ELEMENT_TYPE";
			payload: {
				layerId: string;
				elementType: string;
			};
	  }
	| { type: "UNDO" }
	| { type: "REDO" }
	| { type: "SET_LAYERS"; payload: Layer[] }
	| { type: "SET_ZOOM"; payload: number }
	| { type: "SET_PAN"; payload: { x: number; y: number } }
	| { type: "SET_FRAME_SIZE"; payload: { width: number; height: number } }
	| {
			type: "OPEN_ADD_LAYER_DIALOG";
			payload: { layerId: string; position: "before" | "inside" | "after" };
	  }
	| { type: "CLOSE_ADD_LAYER_DIALOG" }
	| {
			type: "DELETE_LAYER";
			payload: { layerId: string };
	  }
	| {
			type: "MOVE_LAYER";
			payload: {
				layerIds: string[];
				targetId: string;
				position: "before" | "on" | "after";
			};
	  }
	// Breakpoint actions
	| {
			type: "ADD_BREAKPOINT";
			payload: { breakpoint: Breakpoint };
	  }
	| {
			type: "UPDATE_BREAKPOINT";
			payload: {
				id: string;
				updates: Partial<Omit<Breakpoint, "id">>;
			};
	  }
	| {
			type: "DELETE_BREAKPOINT";
			payload: { id: string };
	  }
	| {
			type: "SET_ACTIVE_BREAKPOINT";
			payload: { breakpointId: string | null };
	  }
	| {
			type: "SELECT_BREAKPOINT";
			payload: { breakpointId: string };
	  }
	| {
			type: "UPDATE_FRAME_STYLES";
			payload: { css: Record<string, string> };
	  }
	| {
			type: "SET_BREAKPOINTS";
			payload: Breakpoint[];
	  }
	| {
			type: "CENTER_ON_BREAKPOINTS";
	  };

// Helper function to find a layer by ID in a nested structure
const findLayer = (
	layers: Layer[],
	layerId: string
): { layer: Layer; parent: Layer[]; index: number } | null => {
	for (let i = 0; i < layers.length; i++) {
		if (layers[i].id === layerId) {
			return { layer: layers[i], parent: layers, index: i };
		}
		if (layers[i].children) {
			const found = findLayer(layers[i].children || [], layerId);
			if (found) {
				return found;
			}
		}
	}
	return null;
};

// Helper function to recursively delete a layer and all its children
const deleteLayer = (layers: Layer[], layerId: string): Layer[] => {
	return layers
		.filter((layer) => layer.id !== layerId)
		.map((layer) => {
			// Recursively delete from children if they exist
			if (layer.children && layer.children.length > 0) {
				return {
					...layer,
					children: deleteLayer(layer.children, layerId),
				};
			}
			return layer;
		});
};

// Helper function to recursively update a layer by ID at any nesting level
const updateLayerById = (
	layers: Layer[],
	layerId: string,
	updater: (layer: Layer) => Layer
): Layer[] => {
	return layers.map((layer) => {
		if (layer.id === layerId) {
			return updater(layer);
		}
		// Recursively update children if they exist
		if (layer.children && layer.children.length > 0) {
			return {
				...layer,
				children: updateLayerById(layer.children, layerId, updater),
			};
		}
		return layer;
	});
};

// Helper function to insert a layer at a specific position
const insertLayer = (
	layers: Layer[],
	newLayer: Layer,
	targetLayerId: string,
	position: "before" | "inside" | "after"
): Layer[] => {
	const found = findLayer(layers, targetLayerId);
	if (!found) {
		// If target not found, append to root
		return [...layers, newLayer];
	}

	const { layer: targetLayer, parent, index } = found;

	if (position === "inside") {
		// Add as child of target layer
		const updatedTarget = {
			...targetLayer,
			children: [...(targetLayer.children || []), newLayer],
		};
		// Recursively update the layers array to replace the target
		return layers.map((l) => {
			if (l.id === targetLayerId) {
				return updatedTarget;
			}
			if (l.children) {
				return {
					...l,
					children: insertLayer(l.children, newLayer, targetLayerId, position),
				};
			}
			return l;
		});
	} else {
		// position === "before" or "after"
		// Insert before/after target layer in its parent
		const insertIndex = position === "before" ? index : index + 1;
		const newParent = [...parent];
		newParent.splice(insertIndex, 0, newLayer);

		// If parent is the root layers array, return the new parent directly
		if (parent === layers) {
			return newParent;
		}

		// Otherwise, find the parent layer and update its children
		const updateParentLayer = (layerList: Layer[]): Layer[] => {
			return layerList.map((l) => {
				// Check if this layer contains the target in its children
				if (l.children?.some((child) => child.id === targetLayerId)) {
					return { ...l, children: newParent };
				}
				// Recursively check nested children
				if (l.children) {
					return { ...l, children: updateParentLayer(l.children) };
				}
				return l;
			});
		};

		return updateParentLayer(layers);
	}
};

// Helper function to add current state to history
const addHistoryEntry = (state: State, newState: Partial<State>): State => {
	const newHistory = [...state.history.slice(0, state.historyIndex + 1), state];
	return {
		...state,
		...newState,
		history: newHistory,
		historyIndex: newHistory.length - 1,
	};
};

// Helper function to update layer CSS (handles primary vs breakpoint-specific)
const updateLayerCss = (
	layer: Layer,
	css: Record<string, string>,
	targetBreakpointId: string | null,
	breakpoints: Breakpoint[]
): Layer => {
	const isPrimary =
		!targetBreakpointId ||
		breakpoints.length === 0 ||
		isPrimaryBreakpoint(targetBreakpointId, breakpoints);

	if (isPrimary) {
		// Update base cssVars for primary breakpoint
		const updatedCssVars = { ...layer.cssVars };
		Object.entries(css).forEach(([key, value]) => {
			if (value === undefined || value === "") {
				delete updatedCssVars[key];
			} else {
				updatedCssVars[key] = value;
			}
		});
		return {
			...layer,
			cssVars: updatedCssVars,
		};
	}

	// Update breakpoint-specific cssVars for non-primary breakpoints
	const currentBreakpointCssVars =
		layer.breakpointCssVars?.[targetBreakpointId] ?? {};
	const updatedBreakpointCssVars = { ...currentBreakpointCssVars };

	Object.entries(css).forEach(([key, value]) => {
		if (value === undefined || value === "") {
			delete updatedBreakpointCssVars[key];
		} else {
			updatedBreakpointCssVars[key] = value;
		}
	});

	// Build the new breakpointCssVars object
	const newBreakpointCssVars = { ...layer.breakpointCssVars };
	if (Object.keys(updatedBreakpointCssVars).length > 0) {
		newBreakpointCssVars[targetBreakpointId] = updatedBreakpointCssVars;
	} else {
		// Remove empty breakpoint entry
		delete newBreakpointCssVars[targetBreakpointId];
	}

	return {
		...layer,
		breakpointCssVars:
			Object.keys(newBreakpointCssVars).length > 0
				? newBreakpointCssVars
				: undefined,
	};
};

// Helper function to handle layer selection
const handleSelectLayer = (
	state: State,
	layerId: string,
	shiftKey: boolean,
	breakpointId?: string
): State => {
	const targetLayer = findLayer(state.layers, layerId);

	// Don't select locked layers
	if (targetLayer?.layer.isLocked) {
		return state;
	}

	const baseUpdate = {
		selectedBreakpointId: null,
		activeBreakpointId: breakpointId ?? state.activeBreakpointId,
	};

	if (shiftKey) {
		if (state.selectedLayers.includes(layerId)) {
			return {
				...state,
				...baseUpdate,
				selectedLayers: state.selectedLayers.filter((id) => id !== layerId),
			};
		}
		return {
			...state,
			...baseUpdate,
			selectedLayers: [...state.selectedLayers, layerId],
		};
	}

	return {
		...state,
		...baseUpdate,
		selectedLayers: [layerId],
	};
};

// Helper function to handle layer movement
const handleMoveLayer = (
	state: State,
	layerIds: string[],
	targetId: string,
	position: "before" | "on" | "after"
): State => {
	const insertPosition = position === "on" ? "inside" : position;
	let newLayers = state.layers;

	for (const layerId of layerIds) {
		if (layerId === targetId) continue;

		const layerToMove = findLayer(newLayers, layerId);
		if (!layerToMove) continue;

		const movedLayer = { ...layerToMove.layer };
		newLayers = deleteLayer(newLayers, layerId);
		newLayers = insertLayer(newLayers, movedLayer, targetId, insertPosition);
	}

	return addHistoryEntry(state, { layers: newLayers });
};

// Helper function to update a simple layer property
const updateLayerProperty = (
	state: State,
	layerId: string,
	updater: (layer: Layer) => Layer
): State => {
	const newLayers = updateLayerById(state.layers, layerId, updater);
	return addHistoryEntry(state, { layers: newLayers });
};

// Helper function to handle undo
const handleUndo = (state: State): State => {
	if (state.history.length > 0 && state.historyIndex >= 0) {
		const restoredState = state.history[state.historyIndex];
		const newIndex = state.historyIndex - 1;
		return {
			...restoredState,
			history: state.history,
			historyIndex: newIndex,
		};
	}
	return state;
};

// Helper function to handle redo
const handleRedo = (state: State): State => {
	if (state.historyIndex < state.history.length - 1) {
		const newIndex = state.historyIndex + 1;
		return {
			...state.history[newIndex],
			history: state.history,
			historyIndex: newIndex,
		};
	}
	return state;
};

// Helper function to handle breakpoint updates with history
const updateBreakpoints = (
	state: State,
	updater: (breakpoints: Breakpoint[]) => Breakpoint[]
): State => {
	const newBreakpoints = updater(state.breakpoints);
	return addHistoryEntry(state, { breakpoints: newBreakpoints });
};

// Helper function to update frame styles
const applyFrameStylesUpdate = (
	state: State,
	css: Record<string, string>
): State => {
	const updatedFrameStyles = { ...state.frameStyles };
	Object.entries(css).forEach(([key, value]) => {
		if (value === undefined || value === "") {
			delete updatedFrameStyles[key];
		} else {
			updatedFrameStyles[key] = value;
		}
	});
	return addHistoryEntry(state, { frameStyles: updatedFrameStyles });
};

const initialState: State = {
	layers: [],
	layerTypes: [],
	selectedLayers: [],
	breakpoints: [],
	activeBreakpointId: null,
	selectedBreakpointId: null,
	frameStyles: {},
	history: [],
	historyIndex: -1,
	zoom: 1,
	pan: { x: 0, y: 0 },
	centerRequestId: 0,
};

const reducer = (state: State, action: Action): State => {
	switch (action.type) {
		case "SET_LAYERS":
			return { ...state, layers: action.payload };
		case "ADD_LAYER": {
			const { layer, targetLayerId, position } = action.payload;
			const newLayers = insertLayer(
				state.layers,
				layer,
				targetLayerId,
				position
			);
			return addHistoryEntry(state, { layers: newLayers });
		}
		case "SELECT_LAYER": {
			return handleSelectLayer(
				state,
				action.payload.layerId,
				action.payload.shiftKey,
				action.payload.breakpointId
			);
		}
		case "DESELECT_ALL":
			return {
				...state,
				selectedLayers: [],
			};
		case "DELETE_LAYER": {
			const { layerId } = action.payload;
			const newLayers = deleteLayer(state.layers, layerId);
			return addHistoryEntry(state, {
				layers: newLayers,
				selectedLayers: state.selectedLayers.filter((id) => id !== layerId),
			});
		}
		case "MOVE_LAYER": {
			return handleMoveLayer(
				state,
				action.payload.layerIds,
				action.payload.targetId,
				action.payload.position
			);
		}
		case "UPDATE_LAYER_NAME":
			return updateLayerProperty(state, action.payload.layerId, (layer) => ({
				...layer,
				name: action.payload.name,
			}));
		case "UPDATE_LAYER_LOCK":
			return updateLayerProperty(state, action.payload.layerId, (layer) => ({
				...layer,
				isLocked: action.payload.isLocked,
			}));
		case "UPDATE_LAYER_ELEMENT_TYPE":
			return updateLayerProperty(state, action.payload.layerId, (layer) => ({
				...layer,
				elementType: action.payload.elementType,
			}));
		case "UPDATE_LAYER_CSS": {
			const { id, css, breakpointId } = action.payload;
			const targetBreakpointId = breakpointId ?? state.activeBreakpointId;
			const newLayers = updateLayerById(state.layers, id, (layer) =>
				updateLayerCss(layer, css, targetBreakpointId, state.breakpoints)
			);
			return addHistoryEntry(state, { layers: newLayers });
		}
		case "UPDATE_LAYER_VALUE":
			return updateLayerProperty(state, action.payload.id, (layer) => ({
				...layer,
				value: action.payload.value,
			}));
		case "UNDO":
			return handleUndo(state);
		case "REDO":
			return handleRedo(state);
		case "SET_FRAME_SIZE":
			return { ...state, frameSize: action.payload };
		case "SET_ZOOM":
			return { ...state, zoom: action.payload };
		case "SET_PAN":
			return { ...state, pan: action.payload };
		case "OPEN_ADD_LAYER_DIALOG":
			return {
				...state,
				addLayerDialog: {
					open: true,
					layerId: action.payload.layerId,
					position: action.payload.position,
				},
			};
		case "CLOSE_ADD_LAYER_DIALOG":
			return {
				...state,
				addLayerDialog: state.addLayerDialog
					? { ...state.addLayerDialog, open: false }
					: undefined,
			};
		// Breakpoint actions
		case "ADD_BREAKPOINT": {
			const newBreakpoints = [...state.breakpoints, action.payload.breakpoint];
			return addHistoryEntry(state, {
				breakpoints: newBreakpoints,
				activeBreakpointId:
					state.activeBreakpointId ?? action.payload.breakpoint.id,
			});
		}
		case "UPDATE_BREAKPOINT":
			return updateBreakpoints(state, (breakpoints) =>
				breakpoints.map((bp) =>
					bp.id === action.payload.id
						? { ...bp, ...action.payload.updates }
						: bp
				)
			);
		case "DELETE_BREAKPOINT": {
			if (state.breakpoints.length <= 1) {
				return state;
			}
			const newBreakpoints = state.breakpoints.filter(
				(bp) => bp.id !== action.payload.id
			);
			return addHistoryEntry(state, {
				breakpoints: newBreakpoints,
				activeBreakpointId:
					state.activeBreakpointId === action.payload.id
						? (newBreakpoints[0]?.id ?? null)
						: state.activeBreakpointId,
				selectedBreakpointId:
					state.selectedBreakpointId === action.payload.id
						? null
						: state.selectedBreakpointId,
			});
		}
		case "SET_ACTIVE_BREAKPOINT":
			return {
				...state,
				activeBreakpointId: action.payload.breakpointId,
			};
		case "SELECT_BREAKPOINT":
			return {
				...state,
				selectedBreakpointId: action.payload.breakpointId,
				selectedLayers: [], // Clear layer selection when selecting a breakpoint
				activeBreakpointId: action.payload.breakpointId, // Also set as active
			};
		case "UPDATE_FRAME_STYLES": {
			return applyFrameStylesUpdate(state, action.payload.css);
		}
		case "SET_BREAKPOINTS": {
			return {
				...state,
				breakpoints: action.payload,
				// Set first breakpoint as active if none selected
				activeBreakpointId:
					state.activeBreakpointId ?? action.payload[0]?.id ?? null,
			};
		}
		case "CENTER_ON_BREAKPOINTS": {
			// Increment centerRequestId to signal DesignerCanvas to re-center
			return {
				...state,
				centerRequestId: state.centerRequestId + 1,
			};
		}
		default:
			return state;
	}
};

/**
 * Props for the `useDesigner` hook.
 */
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
	 * @deprecated Use breakpoints instead
	 * The size of the frame.
	 */
	frameSize?: { width: number; height: number };
	/**
	 * The initial breakpoints (responsive frames).
	 */
	breakpoints?: Breakpoint[];
	/**
	 * Shared document-level styles.
	 */
	frameStyles?: CSSVars;
};

/**
 * The core hook for the designer state management.
 */
export const useDesigner = ({
	defaultLayers,
	layers,
	onLayersChange,
	frameSize,
	layerTypes,
	breakpoints,
	frameStyles,
}: UseDesignerProps) => {
	// If no breakpoints provided but frameSize is, create a default breakpoint
	const initialBreakpoints: Breakpoint[] =
		breakpoints ??
		(frameSize
			? [
					{
						id: "default",
						name: "Default",
						width: frameSize.width,
						height: frameSize.height,
						position: { x: 0, y: 0 },
					},
				]
			: []);

	const [state, dispatch] = useReducer(reducer, {
		...initialState,
		layers: defaultLayers || layers || [],
		layerTypes: layerTypes || [],
		frameSize,
		breakpoints: initialBreakpoints,
		activeBreakpointId: initialBreakpoints[0]?.id ?? null,
		frameStyles: frameStyles ?? {},
	});

	useEffect(() => {
		if (layers) {
			dispatch({ type: "SET_LAYERS", payload: layers });
		}
	}, [layers]);

	useEffect(() => {
		if (onLayersChange) {
			onLayersChange(state.layers);
		}
	}, [state.layers, onLayersChange]);

	return { state, dispatch };
};
