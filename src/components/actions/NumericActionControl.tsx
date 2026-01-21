import { Button } from "@base-ui/react/button";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { type ReactNode, useMemo, useState } from "react";
import { useBreakpointCss } from "../../hooks/useBreakpointCss";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { formatCSSValue, parseCSSValue } from "../../lib/cssValueHelpers";
import { ClearButton } from "../common/ClearButton";
import { InputGroup } from "../common/InputGroup";
import { Select } from "../common/Select";
import { Tooltip } from "../common/Tooltip";
import { DesignAction } from "../DesignAction";

const DEFAULT_UNITS = ["px", "%", "vw", "vh", "rem", "em"] as const;

interface NumericActionControlProps {
	cssProperty: string;
	label: string;
	defaultValue?: number;
	units?: readonly string[];
	defaultUnit?: string;
	step?: number;
	showSteppers?: boolean;
	orientation?: "horizontal" | "vertical";
	addon?: ReactNode;
	placeholder?: string;
}

export const NumericActionControl = ({
	cssProperty,
	label,
	defaultValue = 0,
	units = DEFAULT_UNITS,
	defaultUnit = "px",
	step = 1,
	showSteppers = true,
	orientation = "vertical",
	addon = "",
	placeholder,
}: NumericActionControlProps) => {
	const selectedLayers = useSelectedLayers();
	const selectedLayer = selectedLayers[0];

	// Use breakpoint-aware CSS hook
	const {
		value: rawValue,
		inheritedValue,
		isExplicit,
		fromBreakpointName,
		isPrimary,
		setValue,
		clearValue,
	} = useBreakpointCss(cssProperty);

	// Parse the current value into number and unit
	const { value: numericValue, unit: currentUnit } = useMemo(() => {
		return parseCSSValue(rawValue, defaultUnit);
	}, [rawValue, defaultUnit]);

	// Parse inherited value for placeholder
	const { value: inheritedNumericValue } = useMemo(() => {
		return parseCSSValue(inheritedValue, defaultUnit);
	}, [inheritedValue, defaultUnit]);

	// Local state for unit (to allow changing unit independently)
	const [selectedUnit, setSelectedUnit] = useState(currentUnit);

	// Update CSS property with new value
	const updateCSSValue = (value: number | string, unit: string) => {
		if (selectedLayer) {
			const cssValue = formatCSSValue(value, unit);
			setValue(cssValue);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value.trim();
		updateCSSValue(value, selectedUnit);
	};

	const handleIncrease = () => {
		if (selectedLayer) {
			const baseValue = numericValue || inheritedNumericValue || defaultValue;
			const newValue = baseValue + step;
			updateCSSValue(newValue, selectedUnit);
		}
	};

	const handleDecrease = () => {
		if (selectedLayer) {
			const baseValue = numericValue || inheritedNumericValue || defaultValue;
			const newValue = baseValue - step;
			updateCSSValue(newValue, selectedUnit);
		}
	};

	const handleClear = () => {
		clearValue();
	};

	const handleUnitChange = (newUnit: string) => {
		setSelectedUnit(newUnit);
		// Update the CSS value with the new unit
		if (rawValue) {
			updateCSSValue(numericValue, newUnit);
		}
	};

	// Convert numeric value to string for input
	// If not explicit, show empty and use placeholder for inherited
	const inputValue = isExplicit
		? numericValue === 0 && !rawValue
			? ""
			: numericValue.toString()
		: "";

	// Placeholder shows inherited value
	const inheritedPlaceholder =
		!isExplicit && inheritedNumericValue
			? inheritedNumericValue.toString()
			: placeholder;

	// Convert units array to select items format
	const unitItems = units.map((unit) => ({ label: unit, value: unit }));

	const hasValue = isExplicit;

	// Build tooltip for inheritance info
	const inheritanceTooltip =
		!isPrimary && fromBreakpointName
			? isExplicit
				? `Overrides ${fromBreakpointName}`
				: `Inherited from ${fromBreakpointName}`
			: undefined;

	// Build label with optional override indicator
	const labelWithIndicator = !isPrimary && isExplicit ? `${label} •` : label;

	return (
		<DesignAction label={labelWithIndicator} orientation={orientation}>
			<div className="flex items-center gap-1">
				<Tooltip content={inheritanceTooltip}>
					<div className="flex-1">
						<InputGroup
							value={inputValue}
							onChange={handleInputChange}
							addon={addon}
							placeholder={inheritedPlaceholder}
						/>
					</div>
				</Tooltip>
				<Select
					items={unitItems}
					value={selectedUnit}
					onValueChange={handleUnitChange}
					className="w-full max-w-13"
				/>
			</div>

			{showSteppers && (
				<>
					<Button
						onClick={handleIncrease}
						className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md font-medium text-xs leading-none transition-all focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[4px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 bg-input text-input-foreground hover:bg-input/80 size-7 justify-center p-0 active:scale-95 [&_svg:not([class*='size-'])]:size-3.5"
					>
						<IconPlus />
					</Button>
					<Button
						onClick={handleDecrease}
						className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md font-medium text-xs leading-none transition-all focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[4px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 bg-input text-input-foreground hover:bg-input/80 size-7 justify-center p-0 active:scale-95 [&_svg:not([class*='size-'])]:size-3.5"
					>
						<IconMinus />
					</Button>
				</>
			)}
			<ClearButton hasValue={hasValue} handleClear={handleClear} />
		</DesignAction>
	);
};
