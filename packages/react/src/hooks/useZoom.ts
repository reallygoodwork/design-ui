import { useDesignerSelector } from "./useDesignerSelector";

/**
 * Hook to get the current zoom level. Re-renders only when the zoom changes.
 */
export const useZoom = () => useDesignerSelector((state) => state.zoom);
