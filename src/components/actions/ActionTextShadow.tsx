import {
	IconLineDashed,
	IconLineDotted,
	IconOverline,
	IconStrikethrough,
	IconUnderline,
	IconWaveSine,
} from "@tabler/icons-react";
import { MinusIcon, Tally2Icon } from "lucide-react";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ColorActionPopover } from "./ColorActionPopover";
import { NumericActionControl } from "./NumericActionControl";
import { ToggleGroupControl } from "./ToggleGroupControl";

const TEXT_DECORATION_OPTIONS = [
	{ label: "None", value: "none" },
	{ label: "Underline", value: "underline", icon: <IconUnderline /> },
	{ label: "Overline", value: "overline", icon: <IconOverline /> },
	{ label: "Line Through", value: "line-through", icon: <IconStrikethrough /> },
];

const TEXT_DECORATION_STYLE_OPTIONS = [
	{ label: "Solid", value: "solid", icon: <MinusIcon /> },
	{ label: "Dashed", value: "dashed", icon: <IconLineDashed /> },
	{ label: "Dotted", value: "dotted", icon: <IconLineDotted /> },
	{ label: "Double", value: "double", icon: <Tally2Icon className="-rotate-90" /> },
	{ label: "Wavy", value: "wavy", icon: <IconWaveSine /> },
];

export const ActionTextShadow = () => {
	const selectedLayers = useSelectedLayers();
	const selectedLayer = selectedLayers[0];
	const designerAction = useDesignerAction();

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
