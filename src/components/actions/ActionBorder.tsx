import { useMemo } from "react";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ColorActionPopover } from "./ColorActionPopover";
import { NumericActionControl } from "./NumericActionControl";
import { SelectActionControl } from "./SelectActionControl";

const borderStyles = [
	{ label: "none", value: "none" },
	{ label: "solid", value: "solid" },
	{ label: "dashed", value: "dashed" },
	{ label: "dotted", value: "dotted" },
	{ label: "double", value: "double" },
] as const;

type BorderStyle = (typeof borderStyles)[number]["value"];

export const ActionBorder = () => {
	const selectedLayers = useSelectedLayers();
	const selectedLayer = selectedLayers[0];
	const designerAction = useDesignerAction();

	// A width alone must produce a visible border, so default the style to
	// "solid" when none has been chosen. Emptying the width clears the style
	// too, leaving no orphaned style (which would draw a default-width border).
	const handleWidthChange = (e: React.ChangeEvent<HTMLDivElement>) => {
		if (!selectedLayer || !(e.target instanceof HTMLInputElement)) return;
		const hasWidth = e.target.value.trim() !== "";
		const hasStyle = Boolean(selectedLayer.cssVars?.["--border-style"]);
		if (hasWidth === hasStyle) return;
		designerAction({
			type: "UPDATE_LAYER_CSS",
			payload: {
				id: selectedLayer.id,
				css: { "--border-style": hasWidth ? "solid" : "" },
			},
		});
	};

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
			<div
				className="flex items-center gap-1 mt-2"
				onChange={handleWidthChange}
			>
				<NumericActionControl
					cssProperty="--border-width"
					label="Width"
					defaultValue={1}
					showSteppers={false}
					orientation="horizontal"
				/>
			</div>
			<SelectActionControl
				cssProperty="--border-style"
				label="Style"
				options={borderStyles}
				defaultValue="solid"
				orientation="horizontal"
			/>
		</ColorActionPopover>
	);
};
