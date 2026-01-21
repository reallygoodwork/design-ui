import { useEffect, useReducer } from "react";
import type { Layer, LayerType } from "../lib/Types";

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
			payload: { layerId: string; shiftKey: boolean };
	  }
	| { type: "DESELECT_ALL" }
	| {
			type: "UPDATE_LAYER_CSS";
			payload: {
				id: string;
				css: Record<string, string>;
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

const initialState: State = {
	layers: [],
	layerTypes: [],
	selectedLayers: [],
	history: [],
	historyIndex: -1,
	zoom: 1,
	pan: { x: 0, y: 0 },
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

			const newState = {
				...state,
				layers: newLayers,
			};
			const newHistory = [
				...state.history.slice(0, state.historyIndex + 1),
				state,
			];
			return {
				...newState,
				history: newHistory,
				historyIndex: newHistory.length - 1,
			};
		}
		case "SELECT_LAYER": {
			const { layerId, shiftKey } = action.payload;

			// Find the layer to check if it's locked
			const targetLayer = findLayer(state.layers, layerId);

			// Don't select locked layers
			if (targetLayer?.layer.isLocked) {
				return state;
			}

			if (shiftKey) {
				if (state.selectedLayers.includes(layerId)) {
					return {
						...state,
						selectedLayers: state.selectedLayers.filter((id) => id !== layerId),
					};
				} else {
					return {
						...state,
						selectedLayers: [...state.selectedLayers, layerId],
					};
				}
			} else {
				return {
					...state,
					selectedLayers: [layerId],
				};
			}
		}
		case "DESELECT_ALL":
			return {
				...state,
				selectedLayers: [],
			};
		case "DELETE_LAYER": {
			const { layerId } = action.payload;
			const newLayers = deleteLayer(state.layers, layerId);
			const newState = {
				...state,
				layers: newLayers,
				// Remove deleted layer from selected layers
				selectedLayers: state.selectedLayers.filter((id) => id !== layerId),
			};
			const newHistory = [
				...state.history.slice(0, state.historyIndex + 1),
				state,
			];
			return {
				...newState,
				history: newHistory,
				historyIndex: newHistory.length - 1,
			};
		}
		case "MOVE_LAYER": {
			const { layerIds, targetId, position } = action.payload;

			// Map "on" to "inside" for insertLayer
			const insertPosition = position === "on" ? "inside" : position;

			let newLayers = state.layers;

			// Move each layer one by one
			for (const layerId of layerIds) {
				// Don't allow moving a layer into itself or its descendants
				if (layerId === targetId) continue;

				// Find the layer to move
				const layerToMove = findLayer(newLayers, layerId);
				if (!layerToMove) continue;

				// Clone the layer (we need to preserve it before deletion)
				const movedLayer = { ...layerToMove.layer };

				// Remove the layer from its current position
				newLayers = deleteLayer(newLayers, layerId);

				// Insert at the new position
				newLayers = insertLayer(newLayers, movedLayer, targetId, insertPosition);
			}

			const newState = {
				...state,
				layers: newLayers,
			};
			const newHistory = [
				...state.history.slice(0, state.historyIndex + 1),
				state,
			];
			return {
				...newState,
				history: newHistory,
				historyIndex: newHistory.length - 1,
			};
		}
		case "UPDATE_LAYER_NAME": {
			const newState = {
				...state,
				layers: updateLayerById(
					state.layers,
					action.payload.layerId,
					(layer) => ({
						...layer,
						name: action.payload.name,
					})
				),
			};
			const newHistory = [
				...state.history.slice(0, state.historyIndex + 1),
				state,
			];
			return {
				...newState,
				history: newHistory,
				historyIndex: newHistory.length - 1,
			};
		}
		case "UPDATE_LAYER_LOCK": {
			const newState = {
				...state,
				layers: updateLayerById(
					state.layers,
					action.payload.layerId,
					(layer) => ({
						...layer,
						isLocked: action.payload.isLocked,
					})
				),
			};
			const newHistory = [
				...state.history.slice(0, state.historyIndex + 1),
				state,
			];
			return {
				...newState,
				history: newHistory,
				historyIndex: newHistory.length - 1,
			};
		}
		case "UPDATE_LAYER_ELEMENT_TYPE": {
			const newState = {
				...state,
				layers: updateLayerById(
					state.layers,
					action.payload.layerId,
					(layer) => ({
						...layer,
						elementType: action.payload.elementType,
					})
				),
			};
			const newHistory = [
				...state.history.slice(0, state.historyIndex + 1),
				state,
			];
			return {
				...newState,
				history: newHistory,
				historyIndex: newHistory.length - 1,
			};
		}
		case "UPDATE_LAYER_CSS": {
			const newState = {
				...state,
				layers: updateLayerById(state.layers, action.payload.id, (layer) => {
					// Merge CSS vars, removing any that are set to empty string or undefined
					const updatedCssVars = { ...layer.cssVars };
					Object.entries(action.payload.css).forEach(([key, value]) => {
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
				}),
			};
			const newHistory = [
				...state.history.slice(0, state.historyIndex + 1),
				state,
			];
			return {
				...newState,
				history: newHistory,
				historyIndex: newHistory.length - 1,
			};
		}
		case "UPDATE_LAYER_VALUE": {
			const newState = {
				...state,
				layers: updateLayerById(state.layers, action.payload.id, (layer) => ({
					...layer,
					value: action.payload.value,
				})),
			};
			const newHistory = [
				...state.history.slice(0, state.historyIndex + 1),
				state,
			];
			return {
				...newState,
				history: newHistory,
				historyIndex: newHistory.length - 1,
			};
		}
		case "UNDO": {
			if (state.history.length > 0 && state.historyIndex >= 0) {
				// Restore the state at historyIndex (this is the state before the current action)
				const restoredState = state.history[state.historyIndex];
				// Move historyIndex back by 1, or to -1 if we're at the first entry
				const newIndex = state.historyIndex - 1;
				return {
					...restoredState,
					history: state.history,
					historyIndex: newIndex,
				};
			}
			return state;
		}
		case "REDO": {
			if (state.historyIndex < state.history.length - 1) {
				const newIndex = state.historyIndex + 1;
				return {
					...state.history[newIndex],
					history: state.history,
					historyIndex: newIndex,
				};
			}
			return state;
		}
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
	 * The size of the frame.
	 */
	frameSize?: { width: number; height: number };
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
}: UseDesignerProps) => {
	const [state, dispatch] = useReducer(reducer, {
		...initialState,
		layers: defaultLayers || layers || [],
		layerTypes: layerTypes || [],
		frameSize,
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
