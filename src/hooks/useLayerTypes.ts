import { useDesignerSelector } from "./useDesignerSelector";

export const useLayerTypes = () =>
	useDesignerSelector((state) => state.layerTypes);
