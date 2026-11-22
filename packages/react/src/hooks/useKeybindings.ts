import { buildLayerIndex, getEffectiveStyles, getLayer } from "@design-ui/core";
import { useEffect, useRef } from "react";
import {
	isControlTarget,
	isEditableTarget,
	isInLayerTree,
	isPopupOpen,
} from "../lib/keyboardTargets";
import type { Layer } from "../lib/Types";
import type { Action, State } from "./useDesigner";
import { useDesignerContext } from "./useDesignerContext";

type Dispatch = (action: Action) => void;

const newLayerId = () =>
	`layer-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

const withNewIds = (layer: Layer): Layer => ({
	...layer,
	id: newLayerId(),
	children: layer.children?.map(withNewIds),
});

const insertAndSelect = (
	state: State,
	dispatch: Dispatch,
	layer: Layer,
	targetLayerId: string
) => {
	dispatch({
		type: "ADD_LAYER",
		payload: { layer, targetLayerId, position: "after" },
	});
	dispatch({
		type: "SELECT_LAYER",
		payload: { layerId: layer.id, shiftKey: false },
	});
	return state;
};

const addLayerFromShortcut = (
	event: KeyboardEvent,
	state: State,
	dispatch: Dispatch
) => {
	if (event.metaKey || event.ctrlKey || event.altKey) return false;
	const layerType = state.layerTypes.find(
		(type) => type.keybinding?.key === event.key
	);
	if (!layerType) return false;
	const target =
		state.selectedLayers[0] ?? state.rootIds[state.rootIds.length - 1] ?? "";
	insertAndSelect(
		state,
		dispatch,
		{ id: newLayerId(), type: layerType.type, ...layerType.defaultValues },
		target
	);
	return true;
};

const duplicateSelection = (
	event: KeyboardEvent,
	state: State,
	dispatch: Dispatch
) => {
	const isDuplicate =
		(event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d";
	if (!isDuplicate || state.selectedLayers.length === 0) return false;
	event.preventDefault();
	const index = buildLayerIndex(state.layers);
	for (const id of state.selectedLayers) {
		const layer = getLayer(index, id);
		if (layer)
			insertAndSelect(
				state,
				dispatch,
				{ ...withNewIds(layer), name: `${layer.name} copy` },
				id
			);
	}
	return true;
};

const NUDGES: Record<string, { property: string; sign: number }> = {
	ArrowUp: { property: "top", sign: -1 },
	ArrowDown: { property: "top", sign: 1 },
	ArrowLeft: { property: "left", sign: -1 },
	ArrowRight: { property: "left", sign: 1 },
};

const POSITIONED = ["absolute", "fixed", "relative", "sticky"];

const nudgeLayer = (
	layer: Layer,
	state: State,
	dispatch: Dispatch,
	nudge: (typeof NUDGES)[string],
	distance: number
) => {
	const css = state.activeBreakpointId
		? getEffectiveStyles(layer, state.activeBreakpointId, state.breakpoints)
		: (layer.cssVars ?? {});
	if (!POSITIONED.includes(css.position ?? "")) return false;
	const current = Number.parseFloat(css[nudge.property] ?? "0") || 0;
	dispatch({
		type: "UPDATE_LAYER_CSS",
		payload: {
			id: layer.id,
			css: { [nudge.property]: `${current + nudge.sign * distance}px` },
		},
	});
	return true;
};

/** Arrow keys move positioned layers. Layers in normal flow have no offset. */
const nudgeSelection = (
	event: KeyboardEvent,
	state: State,
	dispatch: Dispatch
) => {
	const nudge = NUDGES[event.key];
	if (!nudge || state.selectedLayers.length === 0) return false;
	const index = buildLayerIndex(state.layers);
	const distance = event.shiftKey ? 10 : 1;
	const moved = state.selectedLayers
		.map((id) => getLayer(index, id))
		.filter((layer) => layer !== null)
		.map((layer) => nudgeLayer(layer, state, dispatch, nudge, distance))
		.some(Boolean);
	if (moved) event.preventDefault();
	return moved;
};

const deselectOnEscape = (state: State, dispatch: Dispatch) => {
	if (state.selectedLayers.length > 0 && !isPopupOpen()) {
		dispatch({ type: "DESELECT_ALL" });
	}
};

const runShortcut = (
	event: KeyboardEvent,
	state: State,
	dispatch: Dispatch
) => {
	const { target } = event;
	if (isEditableTarget(target)) return;
	if (event.key === "Escape") {
		deselectOnEscape(state, dispatch);
		return;
	}
	if (duplicateSelection(event, state, dispatch)) return;
	if (isControlTarget(target) || isInLayerTree(target)) return;
	if (!nudgeSelection(event, state, dispatch)) {
		addLayerFromShortcut(event, state, dispatch);
	}
};

export const useKeybindings = () => {
	const { state, dispatch } = useDesignerContext();

	const stateRef = useRef(state);
	stateRef.current = state;

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			runShortcut(event, stateRef.current, dispatch);
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [dispatch]);
};
