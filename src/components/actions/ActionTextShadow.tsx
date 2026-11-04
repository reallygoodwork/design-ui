import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ColorActionPopover } from "./ColorActionPopover";
import { NumericActionControl } from "./NumericActionControl";

export const ActionTextShadow = () => {
	const selectedLayers = useSelectedLayers();
	const selectedLayer = selectedLayers[0];

	const vars = selectedLayer?.cssVars;
	const parts = [
		vars?.["--text-shadow-offset-x"],
		vars?.["--text-shadow-offset-y"],
		vars?.["--text-shadow-blur-radius"],
	];
	const currentValue =
		vars?.["--text-shadow-color"] || parts.some(Boolean)
			? parts.map((v) => v || "0").join(" ")
			: "none";
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
