import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { InputGroup } from "../common/InputGroup";
import { DesignAction } from "../DesignAction";

export const ActionSize = () => {
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
          css: { "--width": value ? `${value}px` : "" },
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
          css: { "--height": value ? `${value}px` : "" },
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
    <DesignAction label="Size">
      <InputGroup
        addon="W"
        type="number"
        value={getNumericValue(selectedLayer?.cssVars?.["--width"])}
        onChange={handleXChange}
      />
      <InputGroup
        addon="H"
        type="number"
        value={getNumericValue(selectedLayer?.cssVars?.["--height"])}
        onChange={handleYChange}
      />
    </DesignAction>
  );
};
