import { useMemo } from "react";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ActionPopover } from "./ActionPopover";
import { NumericActionControl } from "./NumericActionControl";
import { SelectActionControl } from "./SelectActionControl";

const POSITION_OPTIONS = [
  { label: "static", value: "static" },
  { label: "relative", value: "relative" },
  { label: "absolute", value: "absolute" },
  { label: "fixed", value: "fixed" },
  { label: "sticky", value: "sticky" },
  { label: "inherit", value: "inherit" },
  { label: "initial", value: "initial" },
  { label: "revert", value: "revert" },
  { label: "revert-layer", value: "revert-layer" },
  { label: "unset", value: "unset" },
] as const;

const EDGE_PROPERTIES = ["top", "right", "bottom", "left"] as const;

export const ActionPosition = () => {
  const selectedLayers = useSelectedLayers();
  const selectedLayer = selectedLayers[0];

  const currentPosition = selectedLayer?.cssVars?.position || "static";

  // Format display value
  const displayValue = useMemo(() => {
    const appliedValues = EDGE_PROPERTIES.map((prop) => {
      const rawValue = selectedLayer?.cssVars?.[prop];
      if (!rawValue) return null;
      return `${prop}: ${rawValue}`;
    }).filter(Boolean);

    if (appliedValues.length === 0) {
      return currentPosition;
    }

    return `${currentPosition} (${appliedValues.join(", ")})`;
  }, [currentPosition, selectedLayer?.cssVars]);

  return (
    <ActionPopover
      cssProperty={["position", ...EDGE_PROPERTIES]}
      label="Position"
      popoverTitle="Position"
      triggerDisplayValue={displayValue}
    >
      <div className="flex flex-col gap-2">
        <SelectActionControl
          cssProperty="position"
          label="Type"
          options={POSITION_OPTIONS}
          defaultValue="static"
          orientation="horizontal"
        />

        {EDGE_PROPERTIES.map((property) => (
          <NumericActionControl
            key={property}
            cssProperty={property}
            label={property.charAt(0).toUpperCase() + property.slice(1)}
            showSteppers={false}
            orientation="horizontal"
          />
        ))}
      </div>
    </ActionPopover>
  );
};
