import type { Layer } from "../lib/Types";
import { useDesignerContext } from "./useDesignerContext";

/**
 * Hook to get the currently selected layers from the designer state.
 * Recursively searches nested layers to support selecting children.
 */
export const useSelectedLayers = () => {
  const { state } = useDesignerContext();

  // Recursive helper to find layers by ID in a nested structure
  const findLayersById = (layers: Layer[], ids: string[]): Layer[] => {
    const found: Layer[] = [];
    for (const layer of layers) {
      if (ids.includes(layer.id)) {
        found.push(layer);
      }
      if (layer.children) {
        found.push(...findLayersById(layer.children, ids));
      }
    }
    return found;
  };

  return findLayersById(state.layers, state.selectedLayers);
};