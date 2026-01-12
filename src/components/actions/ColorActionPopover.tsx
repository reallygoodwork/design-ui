import { Input } from "@base-ui/react/input";
import { colord } from "colord";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { HslaStringColorPicker, RgbaStringColorPicker } from "react-colorful";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import {
	type ColorFormat,
	colorFormats,
	convertColorToFormat,
	validateColorFormat,
} from "../../utils/colorUtils";
import { Select } from "../common/Select";
import { ActionPopover } from "./ActionPopover";

interface ColorActionPopoverProps {
	cssProperty: string;
	label: string;
	popoverTitle: string;
	triggerDisplayValue?: string;
	children?: ReactNode;
}

export const ColorActionPopover = ({
	cssProperty,
	label,
	popoverTitle,
	triggerDisplayValue,
	children,
}: ColorActionPopoverProps) => {
	const [colorFormat, setColorFormat] = useState<ColorFormat>("hex");
	const [inputValue, setInputValue] = useState<string>("");
	const [isInputValid, setIsInputValid] = useState<boolean>(true);
	const selectedLayers = useSelectedLayers();
	const designerAction = useDesignerAction();
	const selectedLayer = selectedLayers[0];

	const rawColorValue = selectedLayer?.cssVars?.[cssProperty];
	const hasValue = Boolean(rawColorValue);

	// Get the color in the current format for display
	const formattedColor = useMemo(() => {
		return convertColorToFormat(rawColorValue, colorFormat);
	}, [rawColorValue, colorFormat]);

	// Get the color in the format needed for the color picker
	const pickerColor = useMemo(() => {
		if (!hasValue) {
			return colorFormat === "hsla" ? "hsla(0, 0%, 0%, 0)" : "rgba(0, 0, 0, 0)";
		}
		// Color pickers use rgba or hsla format
		if (colorFormat === "hsla") {
			return convertColorToFormat(rawColorValue, "hsla");
		}
		return convertColorToFormat(rawColorValue, "rgba");
	}, [rawColorValue, colorFormat, hasValue]);

	// Update input value when format or color changes
	useEffect(() => {
		setInputValue(formattedColor);
		setIsInputValid(true);
	}, [formattedColor]);

	const handleColorChange = (newColor: string) => {
		if (selectedLayer) {
			// If empty, clear the color
			if (!newColor || !newColor.trim()) {
				designerAction({
					type: "UPDATE_LAYER_CSS",
					payload: {
						id: selectedLayer.id,
						css: { [cssProperty]: "" },
					},
				});
				return;
			}

			// Convert the color from the picker (rgba/hsla) to the selected format
			const convertedColor = convertColorToFormat(newColor, colorFormat);
			designerAction({
				type: "UPDATE_LAYER_CSS",
				payload: {
					id: selectedLayer.id,
					css: { [cssProperty]: convertedColor },
				},
			});
		}
	};

	const handleInputChange = (value: string) => {
		setInputValue(value);

		// If empty, allow clearing (don't validate empty)
		if (!value.trim()) {
			setIsInputValid(true);
			handleColorChange("");
			return;
		}

		// Validate the input format
		const isValid = validateColorFormat(value, colorFormat);
		setIsInputValid(isValid);

		// Only update if valid
		if (isValid && selectedLayer) {
			// Convert to the format if needed (colord can handle conversion)
			const colorObj = colord(value);
			if (colorObj.isValid()) {
				// Store in the selected format
				const convertedColor = convertColorToFormat(value, colorFormat);
				handleColorChange(convertedColor);
			}
		}
	};

	const handleFormatChange = (newFormat: ColorFormat) => {
		setColorFormat(newFormat);
		// Input value will be updated by the useMemo hook
	};

	const displayValue = triggerDisplayValue ?? formattedColor;

	return (
		<ActionPopover
			cssProperty={cssProperty}
			label={label}
			popoverTitle={popoverTitle}
			triggerDisplayValue={displayValue}
			showSwatch={true}
			swatchColor={hasValue ? rawColorValue : "transparent"}
		>
			<div className="[&_div.react-colorful]:w-full!">
				{colorFormat === "hsla" ? (
					<HslaStringColorPicker
						color={pickerColor}
						onChange={handleColorChange}
					/>
				) : (
					<RgbaStringColorPicker
						color={pickerColor}
						onChange={handleColorChange}
					/>
				)}
			</div>

			<div className="flex items-center gap-1">
				<Input
					value={inputValue}
					onChange={(e) => handleInputChange(e.target.value)}
					placeholder={
						colorFormat === "hex"
							? ""
							: colorFormat === "rgba"
								? "rgba(255, 255, 255, 1)"
								: "hsla(0, 0%, 100%, 1)"
					}
					aria-invalid={!isInputValid}
					className={`flex h-7 w-full min-w-0 rounded-md border bg-input px-2 py-1 text-base outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
						isInputValid
							? "border-input"
							: "border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
					}`}
				/>
				<Select
					items={colorFormats}
					value={colorFormat}
					onValueChange={(value) => handleFormatChange(value as ColorFormat)}
					className="flex-1"
				/>
			</div>

			{children}
		</ActionPopover>
	);
};
