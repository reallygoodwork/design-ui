import { useMemo, useState } from "react";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ColorActionPopover } from "./ColorActionPopover";
import { NumericActionControl } from "./NumericActionControl";

const borderStyles = [
	{ label: "solid", value: "solid" },
	{ label: "dashed", value: "dashed" },
	{ label: "dotted", value: "dotted" },
	{ label: "double", value: "double" },
	{ label: "none", value: "none" },
] as const;

type BorderStyle = (typeof borderStyles)[number]["value"];

export const ActionBorder = () => {
	const selectedLayers = useSelectedLayers();
	const designerAction = useDesignerAction();
	const selectedLayer = selectedLayers[0];

	const borderColor = selectedLayer?.cssVars?.["--border-color"];
	const borderWidth = selectedLayer?.cssVars?.["--border-width"] || "1px";
	const borderStyle =
		(selectedLayer?.cssVars?.["--border-style"] as BorderStyle) || "solid";

	const [localWidth, setLocalWidth] = useState(borderWidth);
	const [localStyle, setLocalStyle] = useState<BorderStyle>(borderStyle);

	// Create a display value for the trigger
	const triggerDisplayValue = useMemo(() => {
		if (!borderColor) return "none";
		return `${borderWidth} ${borderStyle}`;
	}, [borderColor, borderWidth, borderStyle]);

	const handleWidthChange = (value: string) => {
		setLocalWidth(value);
		if (selectedLayer) {
			designerAction({
				type: "UPDATE_LAYER_CSS",
				payload: {
					id: selectedLayer.id,
					css: { "--border-width": value },
				},
			});
		}
	};

	const handleStyleChange = (value: BorderStyle) => {
		setLocalStyle(value);
		if (selectedLayer) {
			designerAction({
				type: "UPDATE_LAYER_CSS",
				payload: {
					id: selectedLayer.id,
					css: { "--border-style": value },
				},
			});
		}
	};

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
		</ColorActionPopover>
	);
};
