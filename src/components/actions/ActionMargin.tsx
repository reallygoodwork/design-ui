import { useMemo } from "react";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ActionPopover } from "./ActionPopover";
import { NumericActionControl } from "./NumericActionControl";

export const ActionMargin = () => {
  const selectedLayers = useSelectedLayers();
  const selectedLayer = selectedLayers[0];

  // Get all padding values
  const marginTop = selectedLayer?.cssVars?.["--margin-block-start"];
  const marginRight = selectedLayer?.cssVars?.["--margin-inline-start"];
  const marginBottom = selectedLayer?.cssVars?.["--margin-block-end"];
  const marginLeft = selectedLayer?.cssVars?.["--margin-inline-end"];

  // Create display value for trigger
  const triggerDisplayValue = useMemo(() => {
    const values = [marginTop, marginRight, marginBottom, marginLeft];
    const hasAnyValue = values.some((v) => v);

    if (!hasAnyValue) return "";

    // If all values are the same, show single value
    const uniqueValues = [...new Set(values.filter(Boolean))];
    if (uniqueValues.length === 1) {
      return uniqueValues[0];
    }

    // Show abbreviated format: top right bottom left
    return values.map((v) => v || "0").join(" ");
  }, [marginTop, marginRight, marginBottom, marginLeft]);

  return (
    <ActionPopover
      cssProperty={[
        "--margin-top",
        "--margin-right",
        "--margin-bottom",
        "--margin-left",
      ]}
      label="Margin"
      popoverTitle="Margin"
      triggerDisplayValue={triggerDisplayValue ?? ""}
    >
      <NumericActionControl
        cssProperty="--margin-top"
        label="Top"
        defaultValue={0}
        showSteppers={false}
        orientation="horizontal"
      />
      <NumericActionControl
        cssProperty="--margin-right"
        label="Right"
        defaultValue={0}
        showSteppers={false}
        orientation="horizontal"
      />
      <NumericActionControl
        cssProperty="--margin-bottom"
        label="Bottom"
        defaultValue={0}
        showSteppers={false}
        orientation="horizontal"
      />
      <NumericActionControl
        cssProperty="--margin-left"
        label="Left"
        defaultValue={0}
        showSteppers={false}
        orientation="horizontal"
      />
    </ActionPopover>
  );
};
