import { useEffect, useRef, useSyncExternalStore } from "react";
import { isPrimaryBreakpoint } from "../lib/breakpointUtils";
import type { ActionMeta } from "../lib/changeLog";
import {
	denormalize,
	getNode,
	insertLayer,
	mapNodes,
	moveLayer,
	type NodeMap,
	normalize,
	removeLayer,
	type Tree,
	updateNode,
} from "../lib/layerTree";
import type {
	Breakpoint,
	CSSVars,
	Layer,
	LayerNode,
	LayerType,
} from "../lib/Types";

/**
 * The undoable part of the state. Snapshots share structure with the live state.
 */
export type Doc = {
	nodes: NodeMap;
	rootIds: string[];
	breakpoints: Breakpoint[];
	frameStyles: CSSVars;
};

const MAX_HISTORY = 200;

/**
 * The state of the designer.
 */
export type State = {
	/**
	 * The layers, flat: every layer by id, without `children`.
	 */
	nodes: NodeMap;
	/**
	 * The ids of the top-level layers, in order.
	 */
	rootIds: string[];
	/**
	 * The nested layers, derived from `nodes` and `rootIds` (memoised, read-only).
	 * Present on states made by the reducer, the store or `withLayers`.
	 */
	readonly layers: Layer[];
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
	 * Undo and redo stacks of document snapshots.
	 */
	history: { past: Doc[]; future: Doc[] };
	/**
	 * Coalesce key of the last committed action, or null if the run is broken.
	 */
	lastCoalesceKey: string | null;
	/**
	 * The zoom level of the canvas.
	 */
	zoom: number;
	/**
	 * The pan offset of the canvas.
	 */
	pan: { x: number; y: number };
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
	| {
			type: "OPEN_ADD_LAYER_DIALOG";
			payload: { layerId: string; position: "before" | "inside" | "after" };
	  }
	| { type: "CLOSE_ADD_LAYER_DIALOG" }
	| {
			type: "DELETE_LAYERS";
			payload: { layerIds: string[] };
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

// Add the derived nested `layers` accessor (non-enumerable, so spreads drop it)
const withDerived = (state: Omit<State, "layers">): State => {
	if (Object.hasOwn(state, "layers")) {
		return state as State;
	}
	return Object.defineProperty(state, "layers", {
		get(this: State) {
			return denormalize(this.nodes, this.rootIds);
		},
		enumerable: false,
		configurable: true,
	}) as State;
};

/**
 * A copy of `state` holding the given nested layers (normalised).
 */
export const withLayers = (state: State, layers: Layer[]): State =>
	withDerived({ ...state, ...normalize(layers) });

const getDoc = ({ nodes, rootIds, breakpoints, frameStyles }: State): Doc => ({
	nodes,
	rootIds,
	breakpoints,
	frameStyles,
});

// Helper function to commit an edit: push the current Doc to `past`, clear `future`
const addHistoryEntry = (state: State, newState: Partial<State>): State => ({
	...state,
	...newState,
	history: {
		past: [...state.history.past, getDoc(state)].slice(-MAX_HISTORY),
		future: [],
	},
});

/**
 * Edits with the same non-null key, one right after the other, share one undo step.
 */
export const getCoalesceKey = (
	action: Action,
	activeBreakpointId: string | null
): string | null => {
	switch (action.type) {
		case "UPDATE_LAYER_NAME":
			return `name:${action.payload.layerId}`;
		case "UPDATE_LAYER_VALUE":
			return `value:${action.payload.id}`;
		case "UPDATE_LAYER_CSS": {
			const { id, css, breakpointId } = action.payload;
			const bp = breakpointId ?? activeBreakpointId;
			return `css:${id}:${bp}:${Object.keys(css).sort().join(",")}`;
		}
		case "UPDATE_FRAME_STYLES":
			return `frame:${Object.keys(action.payload.css).sort().join(",")}`;
		case "UPDATE_BREAKPOINT": {
			const keys = Object.keys(action.payload.updates);
			return keys.length === 1 && keys[0] === "position"
				? `bp-pos:${action.payload.id}`
				: null;
		}
		default:
			return null;
	}
};

// Helper function to update layer CSS (handles primary vs breakpoint-specific)
const updateLayerCss = (
	layer: LayerNode,
	css: Record<string, string>,
	targetBreakpointId: string | null,
	breakpoints: Breakpoint[]
): LayerNode => {
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
	// Don't select locked layers
	if (getNode(state.nodes, layerId)?.isLocked) {
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
	let tree: Tree = state;

	for (const layerId of layerIds) {
		tree = moveLayer(tree, layerId, targetId, insertPosition);
	}

	return addHistoryEntry(state, { nodes: tree.nodes, rootIds: tree.rootIds });
};

// Helper function to update a simple layer property
const updateLayerProperty = (
	state: State,
	layerId: string,
	updater: (layer: LayerNode) => LayerNode
): State => {
	const tree = updateNode(state, layerId, updater);
	return addHistoryEntry(state, { nodes: tree.nodes, rootIds: tree.rootIds });
};

// Swap the Doc fields only, then drop selection/breakpoint ids that no longer exist
const restoreDoc = (
	state: State,
	doc: Doc,
	history: State["history"]
): State => {
	const hasBp = (id: string | null) =>
		id !== null && doc.breakpoints.some((bp) => bp.id === id);
	return {
		...state,
		...doc,
		history,
		selectedLayers: state.selectedLayers.filter((id) =>
			Object.hasOwn(doc.nodes, id)
		),
		selectedBreakpointId: hasBp(state.selectedBreakpointId)
			? state.selectedBreakpointId
			: null,
		activeBreakpointId: hasBp(state.activeBreakpointId)
			? state.activeBreakpointId
			: (doc.breakpoints[0]?.id ?? null),
	};
};

const handleUndo = (state: State): State => {
	const { past, future } = state.history;
	if (past.length === 0) return state;
	return restoreDoc(state, past[past.length - 1], {
		past: past.slice(0, -1),
		future: [...future, getDoc(state)],
	});
};

const handleRedo = (state: State): State => {
	const { past, future } = state.history;
	if (future.length === 0) return state;
	return restoreDoc(state, future[future.length - 1], {
		past: [...past, getDoc(state)].slice(-MAX_HISTORY),
		future: future.slice(0, -1),
	});
};

// Remove one breakpoint's overrides from every layer.
// Layers with nothing to strip keep their identity.
const stripBreakpointVars = (tree: Tree, id: string): Tree =>
	mapNodes(tree, (node) => {
		if (!(node.breakpointCssVars && id in node.breakpointCssVars)) return node;
		const { breakpointCssVars, ...rest } = node;
		const { [id]: _removed, ...remaining } = breakpointCssVars;
		return Object.keys(remaining).length > 0
			? { ...rest, breakpointCssVars: remaining }
			: rest;
	});

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

export const initialState: State = withDerived({
	nodes: {},
	rootIds: [],
	layerTypes: [],
	selectedLayers: [],
	breakpoints: [],
	activeBreakpointId: null,
	selectedBreakpointId: null,
	frameStyles: {},
	history: { past: [], future: [] },
	lastCoalesceKey: null,
	zoom: 1,
	pan: { x: 0, y: 0 },
	centerRequestId: 0,
});

// True when `targetId` is a layer whose type is known and can't hold children
const cannotHaveChildren = (state: State, targetId: string): boolean => {
	const target = getNode(state.nodes, targetId);
	if (!target) return false;
	const type = state.layerTypes.find((t) => t.type === target.type);
	return !!type && !type.supportsChildren;
};

type ActionHandlers = {
	[K in Action["type"]]: (
		state: State,
		action: Extract<Action, { type: K }>
	) => State;
};

/** One handler per action. Each returns the same state object for a no-op. */
const handlers: ActionHandlers = {
	SET_LAYERS: (state, action) =>
		// Echo of the last emitted nested array: nothing to do
		action.payload === denormalize(state.nodes, state.rootIds)
			? state
			: { ...state, ...normalize(action.payload) },
	ADD_LAYER: (state, action) => {
		const { layer, targetLayerId, position } = action.payload;
		if (position === "inside" && cannotHaveChildren(state, targetLayerId)) {
			return state;
		}
		const tree = insertLayer(state, layer, targetLayerId, position);
		// Existing id: nothing inserted, so no history entry
		if (tree === state) return state;
		return addHistoryEntry(state, { nodes: tree.nodes, rootIds: tree.rootIds });
	},
	SELECT_LAYER: (state, action) =>
		handleSelectLayer(
			state,
			action.payload.layerId,
			action.payload.shiftKey,
			action.payload.breakpointId
		),
	DESELECT_ALL: (state) => ({ ...state, selectedLayers: [] }),
	DELETE_LAYERS: (state, action) => {
		const { layerIds } = action.payload;
		let tree: Tree = state;
		for (const id of layerIds) tree = removeLayer(tree, id);
		return addHistoryEntry(state, {
			nodes: tree.nodes,
			rootIds: tree.rootIds,
			selectedLayers: state.selectedLayers.filter(
				(id) => !layerIds.includes(id)
			),
		});
	},
	MOVE_LAYER: (state, action) => {
		const { layerIds, targetId, position } = action.payload;
		if (position === "on" && cannotHaveChildren(state, targetId)) return state;
		return handleMoveLayer(state, layerIds, targetId, position);
	},
	UPDATE_LAYER_NAME: (state, action) =>
		updateLayerProperty(state, action.payload.layerId, (layer) => ({
			...layer,
			name: action.payload.name,
		})),
	UPDATE_LAYER_LOCK: (state, action) =>
		updateLayerProperty(state, action.payload.layerId, (layer) => ({
			...layer,
			isLocked: action.payload.isLocked,
		})),
	UPDATE_LAYER_ELEMENT_TYPE: (state, action) =>
		updateLayerProperty(state, action.payload.layerId, (layer) => ({
			...layer,
			elementType: action.payload.elementType,
		})),
	UPDATE_LAYER_CSS: (state, action) => {
		const { id, css, breakpointId } = action.payload;
		const targetBreakpointId = breakpointId ?? state.activeBreakpointId;
		const tree = updateNode(state, id, (layer) =>
			updateLayerCss(layer, css, targetBreakpointId, state.breakpoints)
		);
		return addHistoryEntry(state, { nodes: tree.nodes, rootIds: tree.rootIds });
	},
	UPDATE_LAYER_VALUE: (state, action) =>
		updateLayerProperty(state, action.payload.id, (layer) => ({
			...layer,
			value: action.payload.value,
		})),
	UNDO: (state) => handleUndo(state),
	REDO: (state) => handleRedo(state),
	SET_ZOOM: (state, action) => ({ ...state, zoom: action.payload }),
	SET_PAN: (state, action) => ({ ...state, pan: action.payload }),
	OPEN_ADD_LAYER_DIALOG: (state, action) => ({
		...state,
		addLayerDialog: {
			open: true,
			layerId: action.payload.layerId,
			position: action.payload.position,
		},
	}),
	CLOSE_ADD_LAYER_DIALOG: (state) => ({
		...state,
		addLayerDialog: state.addLayerDialog
			? { ...state.addLayerDialog, open: false }
			: undefined,
	}),
	ADD_BREAKPOINT: (state, action) =>
		addHistoryEntry(state, {
			breakpoints: [...state.breakpoints, action.payload.breakpoint],
			activeBreakpointId:
				state.activeBreakpointId ?? action.payload.breakpoint.id,
		}),
	UPDATE_BREAKPOINT: (state, action) =>
		updateBreakpoints(state, (breakpoints) =>
			breakpoints.map((bp) =>
				bp.id === action.payload.id ? { ...bp, ...action.payload.updates } : bp
			)
		),
	DELETE_BREAKPOINT: (state, action) => {
		if (state.breakpoints.length <= 1) return state;
		const { id } = action.payload;
		const newBreakpoints = state.breakpoints.filter((bp) => bp.id !== id);
		const stripped = stripBreakpointVars(state, id);
		return addHistoryEntry(state, {
			breakpoints: newBreakpoints,
			nodes: stripped.nodes,
			rootIds: stripped.rootIds,
			activeBreakpointId:
				state.activeBreakpointId === id
					? (newBreakpoints[0]?.id ?? null)
					: state.activeBreakpointId,
			selectedBreakpointId:
				state.selectedBreakpointId === id ? null : state.selectedBreakpointId,
		});
	},
	SET_ACTIVE_BREAKPOINT: (state, action) => ({
		...state,
		activeBreakpointId: action.payload.breakpointId,
	}),
	SELECT_BREAKPOINT: (state, action) => ({
		...state,
		selectedBreakpointId: action.payload.breakpointId,
		// Selecting a frame clears the layer selection and makes it active
		selectedLayers: [],
		activeBreakpointId: action.payload.breakpointId,
	}),
	UPDATE_FRAME_STYLES: (state, action) =>
		applyFrameStylesUpdate(state, action.payload.css),
	SET_BREAKPOINTS: (state, action) => ({
		...state,
		breakpoints: action.payload,
		// Set first breakpoint as active if none selected
		activeBreakpointId:
			state.activeBreakpointId ?? action.payload[0]?.id ?? null,
	}),
	// Increment centerRequestId to signal DesignerCanvas to re-center
	CENTER_ON_BREAKPOINTS: (state) => ({
		...state,
		centerRequestId: state.centerRequestId + 1,
	}),
};

// Each handler only ever receives its own action type, so widening is safe.
const applyAction = (state: State, action: Action): State =>
	(handlers[action.type] as (state: State, action: Action) => State)(
		state,
		action
	);

export const reducer = (state: State, action: Action): State => {
	const applied = applyAction(state, action);
	if (applied === state) return state;
	const next = withDerived(applied);
	const committed = next.history.past !== state.history.past;
	const key = committed
		? getCoalesceKey(action, state.activeBreakpointId)
		: null;
	if (committed && key !== null && key === state.lastCoalesceKey) {
		// Same run: keep the earlier snapshot on top instead of pushing another
		return withDerived({
			...next,
			history: { past: state.history.past, future: [] },
		});
	}
	// Anything that is not a coalescable edit breaks the run
	return withDerived({ ...next, lastCoalesceKey: key });
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
	 * The initial breakpoints (responsive frames).
	 */
	breakpoints?: Breakpoint[];
	/**
	 * Shared document-level styles.
	 */
	frameStyles?: CSSVars;
};

/**
 * A minimal external store around the reducer. `dispatch` and `subscribe` are
 * referentially stable for the lifetime of the store.
 */
export type DesignerStore = {
	getState: () => State;
	dispatch: React.Dispatch<Action>;
	subscribe: (listener: () => void) => () => void;
	/**
	 * Dispatch with who made the change and why, for the change log. Plain
	 * `dispatch` counts as the person using the editor.
	 */
	dispatchWithMeta: (action: Action, meta: ActionMeta) => void;
	/**
	 * Runs after every action that changed the state, with the state before
	 * and after. For history, logging and sync; it can't change the outcome.
	 */
	observe: (observer: (event: StoreEvent) => void) => () => void;
};

export type StoreEvent = {
	action: Action;
	prev: State;
	next: State;
	meta: ActionMeta;
};

export const createDesignerStore = (initial: State): DesignerStore => {
	let state = withDerived(initial);
	const listeners = new Set<() => void>();
	const observers = new Set<(event: StoreEvent) => void>();
	const run = (action: Action, meta: ActionMeta) => {
		const next = reducer(state, action);
		if (next === state) return;
		const prev = state;
		state = next;
		for (const observer of [...observers])
			observer({ action, prev, next, meta });
		for (const listener of [...listeners]) listener();
	};
	return {
		getState: () => state,
		dispatch: (action) => run(action, {}),
		dispatchWithMeta: run,
		observe: (observer) => {
			observers.add(observer);
			return () => {
				observers.delete(observer);
			};
		},
		subscribe: (listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
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
		});
	}
	const store = storeRef.current;
	const { dispatch } = store;
	const state = useSyncExternalStore(store.subscribe, store.getState);

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
