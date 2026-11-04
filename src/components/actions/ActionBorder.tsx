import { useMemo } from "react";
import { useBreakpointCss } from "../../hooks/useBreakpointCss";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ClearButton } from "../common/ClearButton";
import { Select } from "../common/Select";
import { DesignAction } from "../DesignAction";
import { ColorActionPopover } from "./ColorActionPopover";
import { NumericActionControl } from "./NumericActionControl";

const borderStyles = [
	{ label: "none", value: "none" },
	{ label: "solid", value: "solid" },
	{ label: "dashed", value: "dashed" },
	{ label: "dotted", value: "dotted" },
	{ label: "double", value: "double" },
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
		<DesignAction label="Style" orientation="horizontal">
			<Select
				items={borderStyles}
				value={value ?? inheritedValue ?? "solid"}
				onValueChange={setValue}
			/>
			<ClearButton hasValue={isExplicit} handleClear={clearValue} />
		</DesignAction>
	);
};

export const ActionBorder = () => {
	const selectedLayers = useSelectedLayers();
	const selectedLayer = selectedLayers[0];
	const borderColor = selectedLayer?.cssVars?.["--border-color"];
	const borderWidth = selectedLayer?.cssVars?.["--border-width"] || "1px";
	const borderStyle =
		(selectedLayer?.cssVars?.["--border-style"] as BorderStyle) || "solid";
	// Create a display value for the trigger
	const triggerDisplayValue = useMemo(() => {
		if (!borderColor) return "none";
		return `${borderWidth} ${borderStyle}`;
	}, [borderColor, borderWidth, borderStyle]);

	return (
		<ColorActionPopover
			cssProperty="--border-color"
			label="Border"
			popoverTitle="Border"
			triggerDisplayValue={triggerDisplayValue}
		>
			<div className="flex items-center gap-1 mt-2">
				<NumericActionControl
					cssProperty="--border-width"
					label="Width"
					defaultValue={1}
					showSteppers={false}
					orientation="horizontal"
				/>
			</div>
			<BorderStyleControl />
		</ColorActionPopover>
	);
};
