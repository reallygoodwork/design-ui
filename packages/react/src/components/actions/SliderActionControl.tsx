import type { ReactNode } from "react";
import { useBreakpointCss } from "../../hooks/useBreakpointCss";
import { InputGroup } from "../common/InputGroup";
import { DesignAction } from "../DesignAction";

const MIN_VALUE = 0;
const MAX_VALUE = 100;
const STEP_VALUE = 1;

interface SliderActionControlProps {
	cssProperty: string;
	label: string;
	defaultValue?: number;
	min?: number;
	max?: number;
	step?: number;
	orientation?: "horizontal" | "vertical";
	addon?: ReactNode;
}

export const SliderActionControl = ({
	cssProperty,
	label,
	defaultValue = 0,
	min = MIN_VALUE,
	max = MAX_VALUE,
	step = STEP_VALUE,
	orientation = "horizontal",
	addon = "",
}: SliderActionControlProps) => {
	const {
		value: rawValue,
		isExplicit,
		isOverride,
		setValue,
		clearValue,
	} = useBreakpointCss(cssProperty);

	// Parse numeric value (no units)
	const numericValue = rawValue ? parseFloat(rawValue) : defaultValue;
	const validValue = Number.isNaN(numericValue) ? defaultValue : numericValue;

	const updateCSSValue = (next: number | string) => setValue(`${next}`);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value.trim();
		const typed = Number(value);
		updateCSSValue(
			value === "" || Number.isNaN(typed)
				? value
				: Math.min(max, Math.max(min, typed))
		);
	};

	// Convert numeric value to string for input
	const inputValue = validValue === 0 && !rawValue ? "" : validValue.toString();

	return (
		<DesignAction
			clear={{ hasValue: isExplicit, onClear: clearValue }}
			label={isOverride ? `${label} \u2022` : label}
			orientation={orientation}
			property={cssProperty}
		>
			<div className="flex min-w-0 flex-1 items-center gap-1">
				<InputGroup
					fullWidth
					value={inputValue}
					onChange={handleInputChange}
					addon={addon}
					scrub={{
						value: validValue,
						min,
						max,
						step,
						onChange: updateCSSValue,
					}}
				/>
			</div>
		</DesignAction>
	);
};
