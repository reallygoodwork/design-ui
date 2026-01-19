import { useMemo } from "react";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ActionPopover } from "./ActionPopover";
import { NumericActionControl } from "./NumericActionControl";

export const ActionGap = () => {
	const selectedLayers = useSelectedLayers();
	const designerAction = useDesignerAction();
	const selectedLayer = selectedLayers[0];



	const rowGapValue = selectedLayer?.cssVars?.["--row-gap"];
	const columnGapValue = selectedLayer?.cssVars?.["--column-gap"];

	const handleClear = () => {
		if (selectedLayer) {
			designerAction({
				type: "UPDATE_LAYER_CSS",
				payload: {
					id: selectedLayer.id,
					css: { "--row-gap": "", "--column-gap": "" },
				},
			});
		}
	};

	// Determine preview text with units
	const triggerDisplayValue = useMemo(() => {
		const hasRowGap = Boolean(rowGapValue);
		const hasColumnGap = Boolean(columnGapValue);

		// If neither has a value, show placeholder
		if (!hasRowGap && !hasColumnGap) {
			return "";
		}

		// If both values are the same, show just one
		if (hasRowGap && hasColumnGap && rowGapValue === columnGapValue) {
			return rowGapValue;
		}

		// If one is missing, display it as 0
		const displayRowGap = hasRowGap ? rowGapValue : "0";
		const displayColumnGap = hasColumnGap ? columnGapValue : "0";

		return `${displayRowGap} × ${displayColumnGap}`;
	}, [rowGapValue, columnGapValue]);

	const hasValue = Boolean(rowGapValue || columnGapValue);

  if (
		!selectedLayer ||
		(selectedLayer.cssVars?.["--display"] !== "grid" &&
			selectedLayer.cssVars?.["--display"] !== "flex" &&
			selectedLayer.cssVars?.["--display"] !== "inline-grid" &&
			selectedLayer.cssVars?.["--display"] !== "inline-flex")
	)
		return null;

	return (
		<ActionPopover
			label="Gap"
			popoverTitle="Gap"
			triggerDisplayValue={triggerDisplayValue ?? ""}
			hasValue={hasValue}
			onClear={handleClear}
		>
			<NumericActionControl
				cssProperty="--row-gap"
				label="Row"
				defaultValue={0}
				showSteppers={false}
				orientation="horizontal"
			/>
			<NumericActionControl
				cssProperty="--column-gap"
				label="Column"
				defaultValue={0}
				showSteppers={false}
				orientation="horizontal"
			/>
		</ActionPopover>
	);
};
