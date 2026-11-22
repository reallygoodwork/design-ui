import type { TokenType } from "@design-ui/core";
import { useFrameStyle } from "../hooks/useFrameStyles";
import { ActionPopover } from "./actions/ActionPopover";
import { ColorPicker } from "./common/ColorPicker";
import { InputGroup } from "./common/InputGroup";
import { DesignAction } from "./DesignAction";
import { DesignerPane } from "./DesignerPane";
import { useBinding } from "./tokens/TokenPicker";
import { TokenSlot } from "./tokens/TokenSlot";

/**
 * A text input control for frame styles.
 */
const FrameStyleTextInput = ({
	label,
	cssProperty,
	placeholder,
	tokenType,
}: {
	label: string;
	cssProperty: string;
	placeholder?: string;
	/** Frame styles aren't layer properties, so tokens apply without a canvas preview. */
	tokenType: TokenType;
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
		<DesignAction
			clear={{ hasValue: Boolean(value), onClear: clearValue }}
			label={label}
		>
			<TokenSlot
				title={label}
				binding={{
					type: tokenType,
					cssProperty,
					value,
					onChange: setValue,
					noPreview: true,
				}}
			>
				<InputGroup
					fullWidth
					value={value ?? ""}
					onChange={handleChange}
					placeholder={placeholder}
				/>
			</TokenSlot>
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
		<DesignAction
			clear={{ hasValue: Boolean(value), onClear: clearValue }}
			label={label}
		>
			<TokenSlot
				title={label}
				binding={{
					type: "dimension",
					cssProperty,
					value,
					onChange: setValue,
					noPreview: true,
				}}
			>
				<InputGroup
					fullWidth
					value={numericValue}
					onChange={handleChange}
					placeholder={placeholder}
					type="number"
					suffix={
						<span className="shrink-0 pr-2 text-muted-foreground text-control">
							{unit}
						</span>
					}
					scrub={{
						value: Number(numericValue || placeholder || 0),
						min: 0,
						scaleMax: 96,
						onChange: (next) => setValue(`${next}${unit}`),
					}}
				/>
			</TokenSlot>
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
	const { value, setValue, clearValue } = useFrameStyle(cssProperty);
	const token = {
		type: "color" as const,
		cssProperty,
		value,
		onChange: setValue,
		noPreview: true,
	};
	// The picker edits the token's value, not `var(--…)`.
	const { resolved } = useBinding(token);

	return (
		<ActionPopover
			label={label}
			popoverTitle={popoverTitle}
			triggerDisplayValue={value || "None"}
			hasValue={Boolean(value)}
			onClear={clearValue}
			showSwatch={true}
			swatchColor={resolved}
			token={token}
		>
			<ColorPicker
				value={resolved}
				onChange={(next) => (next ? setValue(next) : clearValue())}
			/>
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
			<p className="text-control text-muted-foreground -mt-1 mb-1">
				These styles apply to all breakpoints
			</p>

			{/* Font Family */}
			<FrameStyleTextInput
				label="Font family"
				cssProperty="--font-family"
				placeholder="Inter, system-ui"
				tokenType="fontFamily"
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
				tokenType="number"
			/>

			{/* Text Color */}
			<FrameStyleColorPicker
				label="Text Color"
				cssProperty="--color"
				popoverTitle="Text color"
			/>

			{/* Background Color */}
			<FrameStyleColorPicker
				label="Background"
				cssProperty="--background-color"
				popoverTitle="Background color"
			/>
		</DesignerPane>
	);
};
