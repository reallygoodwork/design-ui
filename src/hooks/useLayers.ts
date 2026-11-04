import { useDesignerSelector } from "./useDesignerSelector";

/**
 * Hook to get the current layers from the designer state.
 */
export const useLayers = () => useDesignerSelector((state) => state.layers);
