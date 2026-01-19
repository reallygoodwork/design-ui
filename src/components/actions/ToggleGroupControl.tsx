import { Button } from "@base-ui/react/button";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ClearButton } from "../common/ClearButton";
import { DesignAction } from "../DesignAction";

interface ToggleItem {
  label: string;
  value: string;
  icon?: ReactNode;
}

interface ToggleGroupControlProps {
  cssProperty: string;
  label: string;
  options: readonly ToggleItem[];
  defaultValue?: string;
  orientation?: "horizontal" | "vertical";
}

export const ToggleGroupControl = ({
  cssProperty,
  label,
  options,
  defaultValue = "",
  orientation = "vertical",
}: ToggleGroupControlProps) => {
  const selectedLayers = useSelectedLayers();
  const designerAction = useDesignerAction();
  const selectedLayer = selectedLayers[0];

  const currentValue = selectedLayer?.cssVars?.[cssProperty] || defaultValue;

  const handleValueChange = (value: string[]) => {
    if (selectedLayer) {
      designerAction({
        type: "UPDATE_LAYER_CSS",
        payload: {
          id: selectedLayer.id,
          css: { [cssProperty]: value.join(" ") },
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
      <ToggleGroup
        multiple={false}
        value={[currentValue]}
        onValueChange={handleValueChange}
        className="flex h-7 flex-1 items-center gap-1 rounded-md bg-input p-1"
      >
        {options.map((option) => (
          <Toggle
            key={option.value}
            value={option.value}
            aria-label={option.label}
            className="flex h-full flex-1 shrink-0 items-center justify-center rounded-sm text-xs hover:bg-white/40 data-[pressed]:bg-white data-[pressed]:text-black [&_svg:not([class*='size-'])]:size-3.5"
          >
            {option.icon ? option.icon : option.label}
          </Toggle>
        ))}
      </ToggleGroup>
      <ClearButton hasValue={hasValue} handleClear={handleClear} />
    </DesignAction>
  );
};
