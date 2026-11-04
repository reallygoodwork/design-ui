import { useCallback } from "react";
import { buildLayerIndex, getLayer } from "../lib/layerIndex";
import type { Layer } from "../lib/Types";
import { useDesignerSelector } from "./useDesignerSelector";

/**
 * Select one layer by id. The returned object keeps its identity while that
 * layer is unchanged, so consumers only re-render when it is edited.
 */
export const useLayer = (id: string): Layer | null =>
	useDesignerSelector(
		useCallback((state) => getLayer(buildLayerIndex(state.layers), id), [id])
	);
