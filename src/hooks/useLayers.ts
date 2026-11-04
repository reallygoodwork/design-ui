import { denormalize } from "../lib/layerTree";
import { useDesignerSelector } from "./useDesignerSelector";

/**
 * Hook to get the current layers, nested, from the designer state.
 * The array is memoised: it keeps its identity while the layers are unchanged.
 */
export const useLayers = () =>
	useDesignerSelector((state) => denormalize(state.nodes, state.rootIds));
