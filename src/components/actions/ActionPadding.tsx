import { useMemo } from "react";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ActionPopover } from "./ActionPopover";
import { NumericActionControl } from "./NumericActionControl";

export const ActionPadding = () => {
  const selectedLayers = useSelectedLayers();
  const designerAction = useDesignerAction();
  const selectedLayer = selectedLayers[0];

  // Get all padding values
  const paddingTop = selectedLayer?.cssVars?.["--padding-block-start"];
  const paddingRight = selectedLayer?.cssVars?.["--padding-inline-end"];
  const paddingBottom = selectedLayer?.cssVars?.["--padding-block-end"];
  const paddingLeft = selectedLayer?.cssVars?.["--padding-inline-start"];

  // Create display value for trigger
  const triggerDisplayValue = useMemo(() => {
    const values = [paddingTop, paddingRight, paddingBottom, paddingLeft];
    const hasAnyValue = values.some((v) => v);

    if (!hasAnyValue) return "";

    // If all values are the same, show single value
    const uniqueValues = [...new Set(values.filter(Boolean))];
    if (uniqueValues.length === 1) {
      return uniqueValues[0];
    }

    // Show abbreviated format: top right bottom left
    return values.map((v) => v || "0").join(" ");
  }, [paddingTop, paddingRight, paddingBottom, paddingLeft]);

  const hasValue = useMemo(() => {
    return Boolean(paddingTop || paddingRight || paddingBottom || paddingLeft);
  }, [paddingTop, paddingRight, paddingBottom, paddingLeft]);

  const handleClear = () => {
    if (selectedLayer) {
      designerAction({
        type: "UPDATE_LAYER_CSS",
        payload: {
          id: selectedLayer.id,
          css: {
            "--padding-block-start": "",
            "--padding-inline-end": "",
            "--padding-block-end": "",
            "--padding-inline-start": "",
          },
        },
      });
    }
  };

  return (
    <ActionPopover
      label="Padding"
      popoverTitle="Padding"
      triggerDisplayValue={triggerDisplayValue ?? ""}
      hasValue={hasValue}
      onClear={handleClear}
    >
      <NumericActionControl
        cssProperty="--padding-block-start"
        label="Top"
        defaultValue={0}
        showSteppers={false}
        orientation="horizontal"
      />
      <NumericActionControl
        cssProperty="--padding-inline-end"
        label="Right"
        defaultValue={0}
        showSteppers={false}
        orientation="horizontal"
      />
      <NumericActionControl
        cssProperty="--padding-block-end"
        label="Bottom"
        defaultValue={0}
        showSteppers={false}
        orientation="horizontal"
      />
      <NumericActionControl
        cssProperty="--padding-inline-start"
        label="Left"
        defaultValue={0}
        showSteppers={false}
        orientation="horizontal"
      />
    </ActionPopover>
  );
};
