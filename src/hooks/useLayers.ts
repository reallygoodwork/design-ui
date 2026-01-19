import { useDesignerContext } from "./useDesignerContext";

/**
 * Hook to get the current layers from the designer state.
 */
export const useLayers = () => {
	const { state } = useDesignerContext();
	return state.layers;
};
