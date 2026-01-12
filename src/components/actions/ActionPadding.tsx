import { useMemo } from "react";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ActionPopover } from "./ActionPopover";
import { NumericActionControl } from "./NumericActionControl";

export const ActionPadding = () => {
  const selectedLayers = useSelectedLayers();
  const selectedLayer = selectedLayers[0];

  // Get all padding values
  const paddingTop = selectedLayer?.cssVars?.["--padding-top"];
  const paddingRight = selectedLayer?.cssVars?.["--padding-right"];
  const paddingBottom = selectedLayer?.cssVars?.["--padding-bottom"];
  const paddingLeft = selectedLayer?.cssVars?.["--padding-left"];

  // Create display value for trigger
  const triggerDisplayValue = useMemo(() => {
    const values = [paddingTop, paddingRight, paddingBottom, paddingLeft];
    const hasAnyValue = values.some((v) => v);

    if (!hasAnyValue) return "none";

    // If all values are the same, show single value
    const uniqueValues = [...new Set(values.filter(Boolean))];
    if (uniqueValues.length === 1) {
      return uniqueValues[0];
    }

    // Show abbreviated format: top right bottom left
    return values.map((v) => v || "0").join(" ");
  }, [paddingTop, paddingRight, paddingBottom, paddingLeft]);

  return (
    <ActionPopover
      cssProperty={[
        "--padding-top",
        "--padding-right",
        "--padding-bottom",
        "--padding-left",
      ]}
      label="Padding"
      popoverTitle="Padding"
      triggerDisplayValue={triggerDisplayValue ?? ""}
    >
      <NumericActionControl
        cssProperty="--padding-top"
        label="Top"
        defaultValue={0}
        showSteppers={false}
        orientation="horizontal"
      />
      <NumericActionControl
        cssProperty="--padding-right"
        label="Right"
        defaultValue={0}
        showSteppers={false}
        orientation="horizontal"
      />
      <NumericActionControl
        cssProperty="--padding-bottom"
        label="Bottom"
        defaultValue={0}
        showSteppers={false}
        orientation="horizontal"
      />
      <NumericActionControl
        cssProperty="--padding-left"
        label="Left"
        defaultValue={0}
        showSteppers={false}
        orientation="horizontal"
      />
    </ActionPopover>
  );
};
