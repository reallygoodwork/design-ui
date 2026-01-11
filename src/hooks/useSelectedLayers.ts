import { useDesignerContext } from "./useDesignerContext";

/**
 * Hook to get the currently selected layers from the designer state.
 */
export const useSelectedLayers = () => {
  const { state } = useDesignerContext();
  return state.layers.filter((layer) =>
    state.selectedLayers.includes(layer.id)
  );
};