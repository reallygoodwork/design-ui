import { useDesignerContext } from "./useDesignerContext";

export const useLayerTypes = () => {
  const { state } = useDesignerContext();
  return state.layerTypes;
};