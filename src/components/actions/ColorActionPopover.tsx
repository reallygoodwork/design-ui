import type { ReactNode } from "react";
import { useBreakpointCss } from "../../hooks/useBreakpointCss";
import { ColorPicker } from "../common/ColorPicker";
import { useBinding } from "../tokens/TokenPicker";
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
	const { value, isExplicit, isOverride, setValue, clearValue } =
		useBreakpointCss(cssProperty);
	const token = {
		type: "color" as const,
		cssProperty,
		value,
		onChange: setValue,
	};
	// A token's value, not `var(--…)`, is what the picker can edit.
	const { resolved } = useBinding(token);

	return (
		<ActionPopover
			label={isOverride ? `${label} •` : label}
			popoverTitle={popoverTitle}
			property={cssProperty}
			triggerDisplayValue={triggerDisplayValue ?? value ?? ""}
			hasValue={isExplicit}
			inherited={!isExplicit && Boolean(value)}
			onClear={clearValue}
			showSwatch={true}
			swatchColor={resolved}
			token={token}
		>
			{children}
			<ColorPicker
				value={resolved}
				onChange={(next) => (next ? setValue(next) : clearValue())}
			/>
		</ActionPopover>
	);
};
