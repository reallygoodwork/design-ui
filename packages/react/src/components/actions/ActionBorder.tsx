import { useMemo } from "react";
import {
	useBreakpointCss,
	useEffectiveCss,
} from "../../hooks/useBreakpointCss";
import { Select } from "../common/Select";
import { DesignAction } from "../DesignAction";
import { ColorActionPopover } from "./ColorActionPopover";
import { NumericActionControl } from "./NumericActionControl";

const borderStyles = [
	{ label: "None", value: "none" },
	{ label: "Solid", value: "solid" },
	{ label: "Dashed", value: "dashed" },
	{ label: "Dotted", value: "dotted" },
	{ label: "Double", value: "double" },
] as const;

type BorderStyle = (typeof borderStyles)[number]["value"];

/**
 * Breakpoint-aware style select. Nothing is written until the user picks a
 * style; with none set it shows "solid", the render-time default for a width.
 */
const BorderStyleControl = () => {
	const { value, inheritedValue, isExplicit, setValue, clearValue } =
		useBreakpointCss("--border-style");
	return (
		<DesignAction
			clear={{ hasValue: isExplicit, onClear: clearValue }}
			label="Style"
			orientation="horizontal"
		>
			<Select
				items={borderStyles}
				value={value ?? inheritedValue ?? "solid"}
				onValueChange={setValue}
			/>
		</DesignAction>
	);
};

export const ActionBorder = () => {
	const vars = useEffectiveCss();
	const borderColor = vars["--border-color"];
	const borderWidth = vars["--border-width"] || "1px";
	const borderStyle = (vars["--border-style"] as BorderStyle) || "solid";
	// Create a display value for the trigger
	const triggerDisplayValue = useMemo(() => {
		if (!borderColor) return "";
		return `${borderWidth} ${borderStyle}`;
	}, [borderColor, borderWidth, borderStyle]);

	return (
		<ColorActionPopover
			cssProperty="--border-color"
			label="Border"
			popoverTitle="Border"
			triggerDisplayValue={triggerDisplayValue}
		>
			<div className="flex items-center gap-1">
				<NumericActionControl
					cssProperty="--border-width"
					scale={{ px: 20 }}
					min={0}
					label="Width"
					defaultValue={1}
					orientation="horizontal"
				/>
			</div>
			<BorderStyleControl />
		</ColorActionPopover>
	);
};
