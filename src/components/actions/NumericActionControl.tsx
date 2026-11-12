import type { TokenType } from "@design-ui/core";
import type { ReactNode } from "react";
import { usePropertyAccess } from "../../hooks/useAllowed";
import { useBreakpointCss } from "../../hooks/useBreakpointCss";
import { Tooltip } from "../common/Tooltip";
import { UnitField } from "../common/UnitField";
import { DesignAction } from "../DesignAction";
import { TokenSlot } from "../tokens/TokenSlot";

interface NumericActionControlProps {
	cssProperty: string;
	label: string;
	defaultValue?: number;
	units?: readonly string[];
	defaultUnit?: string;
	step?: number;
	min?: number;
	max?: number;
	orientation?: "horizontal" | "vertical";
	addon?: ReactNode;
	placeholder?: string;
	scale?: Record<string, number>;
	/** The kind of token this value can take. */
	tokenType?: TokenType;
}

export const NumericActionControl = ({
	cssProperty,
	label,
	defaultValue = 0,
	units,
	defaultUnit = "px",
	step = 1,
	min,
	max,
	orientation = "horizontal",
	addon,
	placeholder,
	scale,
	tokenType = "dimension",
}: NumericActionControlProps) => {
	// A range from the editing rules narrows the control's own.
	const access = usePropertyAccess(cssProperty);
	min =
		access.min !== undefined ? Math.max(min ?? access.min, access.min) : min;
	max =
		access.max !== undefined ? Math.min(max ?? access.max, access.max) : max;
	units = access.unit && units ? units.filter((u) => u === access.unit) : units;
	const {
		value,
		isExplicit,
		isOverride,
		fromBreakpointName,
		isPrimary,
		setValue,
		clearValue,
	} = useBreakpointCss(cssProperty);

	const inheritanceTooltip =
		!isPrimary && fromBreakpointName
			? isExplicit
				? `Overrides ${fromBreakpointName}`
				: `Inherited from ${fromBreakpointName}`
			: undefined;

	return (
		<DesignAction
			clear={{ hasValue: isExplicit, onClear: clearValue }}
			label={isOverride ? `${label} •` : label}
			orientation={orientation}
			property={cssProperty}
		>
			<TokenSlot
				title={label}
				inherited={!isExplicit}
				binding={{ type: tokenType, cssProperty, value, onChange: setValue }}
			>
				<Tooltip
					content={inheritanceTooltip}
					triggerProps={{ render: <div /> }}
				>
					<UnitField
						value={isExplicit ? value : undefined}
						placeholderValue={isExplicit ? undefined : value}
						placeholder={placeholder}
						units={units}
						defaultUnit={defaultUnit}
						defaultValue={defaultValue}
						step={step}
						min={min}
						max={max}
						addon={addon}
						scale={scale}
						ariaLabel={label}
						onChange={(next) => (next ? setValue(next) : clearValue())}
					/>
				</Tooltip>
			</TokenSlot>
		</DesignAction>
	);
};
