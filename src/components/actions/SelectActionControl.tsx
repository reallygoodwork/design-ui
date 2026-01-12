import { Button } from "@base-ui/react/button";
import { IconX } from "@tabler/icons-react";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { Select } from "../common/Select";
import { DesignAction } from "../DesignAction";

interface SelectItem {
  label: string;
  value: string;
}

interface SelectActionControlProps {
  cssProperty: string;
  label: string;
  options: readonly SelectItem[];
  defaultValue?: string;
  orientation?: "horizontal" | "vertical";
}

export const SelectActionControl = ({
  cssProperty,
  label,
  options,
  defaultValue = "",
  orientation = "vertical",
}: SelectActionControlProps) => {
  const selectedLayers = useSelectedLayers();
  const designerAction = useDesignerAction();
  const selectedLayer = selectedLayers[0];

  const currentValue = selectedLayer?.cssVars?.[cssProperty] || defaultValue;

  const handleValueChange = (value: string) => {
    console.log("SelectActionControl handleValueChange called", { cssProperty, value, selectedLayer: selectedLayer?.id });
    if (selectedLayer) {
      designerAction({
        type: "UPDATE_LAYER_CSS",
        payload: {
          id: selectedLayer.id,
          css: { [cssProperty]: value },
        },
      });
    }
  };

  const handleClear = () => {
    if (selectedLayer) {
      designerAction({
        type: "UPDATE_LAYER_CSS",
        payload: { id: selectedLayer.id, css: { [cssProperty]: "" } },
      });
    }
  };

  const hasValue = Boolean(selectedLayer?.cssVars?.[cssProperty]);

  return (
    <DesignAction label={label} orientation={orientation}>
      <Select
        items={options}
        value={currentValue}
        onValueChange={handleValueChange}
      />
      <Button
        onClick={handleClear}
        disabled={!hasValue}
        className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md font-medium text-xs leading-none transition-all focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[4px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 bg-input text-input-foreground hover:bg-input/80 size-7 justify-center p-0 active:scale-95 [&_svg:not([class*='size-'])]:size-3.5"
      >
        <IconX />
      </Button>
    </DesignAction>
  );
};
