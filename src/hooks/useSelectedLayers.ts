import { useMemo } from "react";
import { buildLayerIndex } from "../lib/layerIndex";
import type { Layer } from "../lib/Types";
import { useDesignerSelector } from "./useDesignerSelector";

/**
 * Hook to get the currently selected layers from the designer state.
 * Uses the id index so nested layers can be selected too.
 */
export const useSelectedLayers = () => {
	const layers = useDesignerSelector((state) => state.layers);
	const selectedLayers = useDesignerSelector((state) => state.selectedLayers);

	return useMemo(() => {
		const { byId, order } = buildLayerIndex(layers);
		const wanted = new Set(selectedLayers);
		// Document order, like the old depth-first walk
		const found: Layer[] = [];
		for (const id of order) {
			const layer = byId.get(id);
			if (wanted.has(id) && layer) {
				found.push(layer);
			}
		}
		return found;
	}, [layers, selectedLayers]);
};
