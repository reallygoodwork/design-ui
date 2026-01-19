import { useMemo } from "react";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ActionPopover } from "./ActionPopover";
import { NumericActionControl } from "./NumericActionControl";

export const ActionSize = () => {
	const selectedLayers = useSelectedLayers();
	const designerAction = useDesignerAction();
	const selectedLayer = selectedLayers[0];

	// Width values
	const widthValue = selectedLayer?.cssVars?.["--width"];
	const minWidthValue = selectedLayer?.cssVars?.["--min-width"];
	const maxWidthValue = selectedLayer?.cssVars?.["--max-width"];

	// Height values
	const heightValue = selectedLayer?.cssVars?.["--height"];
	const minHeightValue = selectedLayer?.cssVars?.["--min-height"];
	const maxHeightValue = selectedLayer?.cssVars?.["--max-height"];

	// Display values for triggers
	const widthDisplay = useMemo(() => {
		if (!widthValue) return "Width";
		return widthValue;
	}, [widthValue]);

	const heightDisplay = useMemo(() => {
		if (!heightValue) return "Height";
		return heightValue;
	}, [heightValue]);

	const hasWidthValue = Boolean(widthValue || minWidthValue || maxWidthValue);
	const hasHeightValue = Boolean(heightValue || minHeightValue || maxHeightValue);

	const handleClearWidth = () => {
		if (selectedLayer) {
			designerAction({
				type: "UPDATE_LAYER_CSS",
				payload: {
					id: selectedLayer.id,
					css: {
						"--width": "",
						"--min-width": "",
						"--max-width": "",
					},
				},
			});
		}
	};

	const handleClearHeight = () => {
		if (selectedLayer) {
			designerAction({
				type: "UPDATE_LAYER_CSS",
				payload: {
					id: selectedLayer.id,
					css: {
						"--height": "",
						"--min-height": "",
						"--max-height": "",
					},
				},
			});
		}
	};

	return (
		<>
			<ActionPopover
				label="Width"
				popoverTitle="Width"
				triggerDisplayValue={widthDisplay}
				hasValue={hasWidthValue}
				onClear={handleClearWidth}
			>
				<NumericActionControl
					cssProperty="--width"
					label="Width"
					defaultValue={0}
					showSteppers={false}
					orientation="horizontal"
				/>
				<NumericActionControl
					cssProperty="--min-width"
					label="Min Width"
					defaultValue={0}
					showSteppers={false}
					orientation="horizontal"
				/>
				<NumericActionControl
					cssProperty="--max-width"
					label="Max Width"
					defaultValue={0}
					showSteppers={false}
					orientation="horizontal"
				/>
			</ActionPopover>

			<ActionPopover
				label="Height"
				popoverTitle="Height"
				triggerDisplayValue={heightDisplay}
				hasValue={hasHeightValue}
				onClear={handleClearHeight}
			>
				<NumericActionControl
					cssProperty="--height"
					label="Height"
					defaultValue={0}
					showSteppers={false}
					orientation="horizontal"
				/>
				<NumericActionControl
					cssProperty="--min-height"
					label="Min Height"
					defaultValue={0}
					showSteppers={false}
					orientation="horizontal"
				/>
				<NumericActionControl
					cssProperty="--max-height"
					label="Max Height"
					defaultValue={0}
					showSteppers={false}
					orientation="horizontal"
				/>
			</ActionPopover>
		</>
	);
};
