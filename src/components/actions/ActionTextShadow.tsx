import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ColorActionPopover } from "./ColorActionPopover";
import { NumericActionControl } from "./NumericActionControl";

export const ActionTextShadow = () => {
	const selectedLayers = useSelectedLayers();
	const selectedLayer = selectedLayers[0];

	const currentValue = selectedLayer?.cssVars?.["--text-decoration"] || "none";
	return (
		<ColorActionPopover
			cssProperty="--text-shadow-color"
			label="Shadow"
			popoverTitle="Text Shadow"
			triggerDisplayValue={currentValue}
		>
			<NumericActionControl
				cssProperty="--text-shadow-blur-radius"
				label="Blur"
				defaultValue={1}
				showSteppers={false}
				orientation="horizontal"
			/>
			<NumericActionControl
				cssProperty="--text-shadow-offset-x"
				label="Offset X"
				defaultValue={1}
				showSteppers={false}
				orientation="horizontal"
			/>
			<NumericActionControl
				cssProperty="--text-shadow-offset-y"
				label="Offset Y"
				defaultValue={1}
				showSteppers={false}
				orientation="horizontal"
			/>
		</ColorActionPopover>
	);
};
