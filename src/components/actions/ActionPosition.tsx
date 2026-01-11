import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { InputGroup } from "../common/InputGroup";
import { DesignAction } from "../DesignAction";

export const ActionPosition = () => {
  const selectedLayers = useSelectedLayers();
  const designerAction = useDesignerAction();
  const selectedLayer = selectedLayers[0];

  const handleXChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedLayer) {
      const value = e.target.value.trim();
      designerAction({
        type: "UPDATE_LAYER_CSS",
        payload: {
          id: selectedLayer.id,
          css: { "--translate-x": value ? `${value}px` : "" },
        },
      });
    }
  };

  const handleYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedLayer) {
      const value = e.target.value.trim();
      designerAction({
        type: "UPDATE_LAYER_CSS",
        payload: {
          id: selectedLayer.id,
          css: { "--translate-y": value ? `${value}px` : "" },
        },
      });
    }
  };

  // Extract numeric value from CSS var (removes "px" suffix)
  // Always return a string to keep the component controlled
  const getNumericValue = (cssVar: string | undefined): string => {
    if (!cssVar) return "";
    const num = parseInt(cssVar.replace("px", ""), 10);
    return Number.isNaN(num) ? "" : num.toString();
  };

  return (
    <DesignAction label="Position">
      <InputGroup
        addon="X"
        type="number"
        value={getNumericValue(selectedLayer?.cssVars?.["--translate-x"])}
        onChange={handleXChange}
      />
      <InputGroup
        addon="Y"
        type="number"
        value={getNumericValue(selectedLayer?.cssVars?.["--translate-y"])}
        onChange={handleYChange}
      />
    </DesignAction>
  );
};
