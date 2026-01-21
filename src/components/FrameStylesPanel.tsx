import { Input } from "@base-ui/react/input";
import { colord } from "colord";
import { useEffect, useMemo, useState } from "react";
import { HslaStringColorPicker, RgbaStringColorPicker } from "react-colorful";
import { useFrameStyle } from "../hooks/useFrameStyles";
import {
	type ColorFormat,
	colorFormats,
	convertColorToFormat,
	validateColorFormat,
} from "../utils/colorUtils";
import { ActionPopover } from "./actions/ActionPopover";
import { ClearButton } from "./common/ClearButton";
import { InputGroup } from "./common/InputGroup";
import { Select } from "./common/Select";
import { DesignAction } from "./DesignAction";
import { DesignerPane } from "./DesignerPane";

/**
 * A text input control for frame styles.
 */
const FrameStyleTextInput = ({
	label,
	cssProperty,
	placeholder,
}: {
	label: string;
	cssProperty: string;
	placeholder?: string;
}) => {
	const { value, setValue, clearValue } = useFrameStyle(cssProperty);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		if (newValue === "") {
			clearValue();
		} else {
			setValue(newValue);
		}
	};

	return (
		<DesignAction label={label}>
			<InputGroup
				value={value ?? ""}
				onChange={handleChange}
				placeholder={placeholder}
			/>
			<ClearButton hasValue={Boolean(value)} handleClear={clearValue} />
		</DesignAction>
	);
};

/**
 * A numeric input control for frame styles.
 */
const FrameStyleNumberInput = ({
	label,
	cssProperty,
	placeholder,
	unit = "px",
}: {
	label: string;
	cssProperty: string;
	placeholder?: string;
	unit?: string;
}) => {
	const { value, setValue, clearValue } = useFrameStyle(cssProperty);

	// Extract numeric value from CSS value (e.g., "16px" -> "16")
	const numericValue = value?.replace(/[^0-9.-]/g, "") ?? "";

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		if (newValue === "") {
			clearValue();
		} else {
			setValue(`${newValue}${unit}`);
		}
	};

	return (
		<DesignAction label={label}>
			<InputGroup
				value={numericValue}
				onChange={handleChange}
				placeholder={placeholder}
				type="number"
			/>
			<ClearButton hasValue={Boolean(value)} handleClear={clearValue} />
		</DesignAction>
	);
};

/**
 * A color picker control for frame styles.
 */
const FrameStyleColorPicker = ({
	label,
	cssProperty,
	popoverTitle,
}: {
	label: string;
	cssProperty: string;
	popoverTitle: string;
}) => {
	const {
		value: rawColorValue,
		setValue,
		clearValue,
	} = useFrameStyle(cssProperty);
	const [colorFormat, setColorFormat] = useState<ColorFormat>("hex");
	const [inputValue, setInputValue] = useState<string>("");
	const [isInputValid, setIsInputValid] = useState<boolean>(true);

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
		if (!newColor || !newColor.trim()) {
			clearValue();
			return;
		}
		const convertedColor = convertColorToFormat(newColor, colorFormat);
		setValue(convertedColor);
	};

	const handleInputChange = (value: string) => {
		setInputValue(value);

		if (!value.trim()) {
			setIsInputValid(true);
			clearValue();
			return;
		}

		const isValid = validateColorFormat(value, colorFormat);
		setIsInputValid(isValid);

		if (isValid) {
			const colorObj = colord(value);
			if (colorObj.isValid()) {
				const convertedColor = convertColorToFormat(value, colorFormat);
				setValue(convertedColor);
			}
		}
	};

	const handleFormatChange = (newFormat: ColorFormat) => {
		setColorFormat(newFormat);
	};

	return (
		<ActionPopover
			label={label}
			popoverTitle={popoverTitle}
			triggerDisplayValue={formattedColor || "None"}
			hasValue={hasValue}
			onClear={clearValue}
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
							? "#000000"
							: colorFormat === "rgba"
								? "rgba(255, 255, 255, 1)"
								: "hsla(0, 0%, 100%, 1)"
					}
					aria-invalid={!isInputValid}
					className={`flex h-7 w-full min-w-0 rounded-md border bg-input px-2 py-1 text-base outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground sm:text-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
						isInputValid
							? "border-input"
							: "border-destructive aria-invalid:ring-destructive/20"
					}`}
				/>
				<Select
					items={colorFormats}
					value={colorFormat}
					onValueChange={(value) => handleFormatChange(value as ColorFormat)}
					className="flex-1"
				/>
			</div>
		</ActionPopover>
	);
};

/**
 * Panel for editing shared document-level styles.
 * These styles apply to ALL breakpoints, like body styles in CSS.
 */
export const FrameStylesPanel = () => {
	return (
		<DesignerPane title="Document Styles">
			<p className="text-xs text-muted-foreground -mt-1 mb-1">
				These styles apply to all breakpoints
			</p>

			{/* Font Family */}
			<FrameStyleTextInput
				label="Font Family"
				cssProperty="--font-family"
				placeholder="Inter, system-ui"
			/>

			{/* Base Font Size */}
			<FrameStyleNumberInput
				label="Font Size"
				cssProperty="--font-size"
				placeholder="16"
			/>

			{/* Line Height */}
			<FrameStyleTextInput
				label="Line Height"
				cssProperty="--line-height"
				placeholder="1.5"
			/>

			{/* Text Color */}
			<FrameStyleColorPicker
				label="Text Color"
				cssProperty="--color"
				popoverTitle="Text Color"
			/>

			{/* Background Color */}
			<FrameStyleColorPicker
				label="Background"
				cssProperty="--background-color"
				popoverTitle="Background Color"
			/>
		</DesignerPane>
	);
};
