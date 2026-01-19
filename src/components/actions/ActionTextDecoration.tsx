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

export const ActionTextDecoration = () => {
	const selectedLayers = useSelectedLayers();
	const selectedLayer = selectedLayers[0];
	const designerAction = useDesignerAction();

	const currentValue = selectedLayer?.cssVars?.["--text-decoration"] || "none";
	return (
		<ColorActionPopover
			cssProperty="--text-decoration-color"
			label="Decoration"
			popoverTitle="Text Decoration"
			triggerDisplayValue={currentValue}

		>
			<ToggleGroupControl
				cssProperty="--text-decoration-line"
				label="Line"
				options={TEXT_DECORATION_OPTIONS}
				defaultValue="none"
        orientation="horizontal"
			/>
			<NumericActionControl
				cssProperty="--text-decoration-thickness"
				label="Thickness"
				defaultValue={1}
				showSteppers={false}
				orientation="horizontal"
			/>
			<ToggleGroupControl
				cssProperty="--text-decoration-style"
				label="Style"
				options={TEXT_DECORATION_STYLE_OPTIONS}
				defaultValue="solid"
				orientation="horizontal"
			/>
		</ColorActionPopover>
	);
};
