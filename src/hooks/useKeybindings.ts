import { useEffect } from "react";
import { useDesignerContext } from "./useDesignerContext";

export const useKeybindings = () => {

  const { state, dispatch } = useDesignerContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      state.layerTypes.forEach((layerType) => {
        if (layerType.keybinding && e.key === layerType.keybinding.key) {
          dispatch({
            type: "ADD_LAYER",
            payload: {
              layer: {
                id: Date.now().toString(),
                type: layerType.type,
                ...layerType.defaultValues,
              },
              targetLayerId: state.layers[state.layers.length - 1]?.id ?? "",
              position: "after",
            },
          });
        }
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [state.layerTypes, state.layers, dispatch]);
};