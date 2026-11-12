import {
	IconLineDashed,
	IconLineDotted,
	IconOverline,
	IconStrikethrough,
	IconUnderline,
	IconWaveSine,
} from "@tabler/icons-react";
import { MinusIcon, Tally2Icon } from "lucide-react";
import { useEffectiveCss } from "../../hooks/useBreakpointCss";
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
	{
		label: "Double",
		value: "double",
		icon: <Tally2Icon className="-rotate-90" />,
	},
	{ label: "Wavy", value: "wavy", icon: <IconWaveSine /> },
];

export const ActionTextDecoration = () => {
	const currentValue = useEffectiveCss()["--text-decoration-line"] || "none";
	return (
		<ColorActionPopover
			cssProperty="--text-decoration-color"
			label="Decoration"
			popoverTitle="Text decoration"
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
				scale={{ px: 20 }}
				min={0}
				label="Thickness"
				defaultValue={1}
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
