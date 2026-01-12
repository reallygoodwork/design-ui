import { Button } from "@base-ui/react/button";
import { IconMinus, IconPlus, IconX } from "@tabler/icons-react";
import { type ReactNode, useMemo, useState } from "react";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { InputGroup } from "../common/InputGroup";
import { Select } from "../common/Select";
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
}

/**
 * Parses a CSS value string into numeric value and unit
 * e.g., "16px" -> { value: 16, unit: "px" }
 */
const parseCSSValue = (
	cssValue: string | undefined,
	defaultUnit: string,
): { value: number; unit: string } => {
	if (!cssValue) return { value: 0, unit: defaultUnit };

	// Match number (including decimals) and unit
	const match = cssValue.match(/^(-?\d+\.?\d*)(.*)$/);
	if (!match) return { value: 0, unit: defaultUnit };

	const value = parseFloat(match[1]);
	const unit = match[2].trim() || defaultUnit;

	return {
		value: Number.isNaN(value) ? 0 : value,
		unit: unit || defaultUnit,
	};
};

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
}: NumericActionControlProps) => {
	const selectedLayers = useSelectedLayers();
	const designerAction = useDesignerAction();
	const selectedLayer = selectedLayers[0];

	const rawValue = selectedLayer?.cssVars?.[cssProperty];

	// Parse the current value into number and unit
	const { value: numericValue, unit: currentUnit } = useMemo(() => {
		return parseCSSValue(rawValue, defaultUnit);
	}, [rawValue, defaultUnit]);

	// Local state for unit (to allow changing unit independently)
	const [selectedUnit, setSelectedUnit] = useState(currentUnit);

	// Update CSS property with new value
	const updateCSSValue = (value: number | string, unit: string) => {
		if (selectedLayer) {
			const cssValue = value === "" ? "" : `${value}${unit}`;
			designerAction({
				type: "UPDATE_LAYER_CSS",
				payload: {
					id: selectedLayer.id,
					css: { [cssProperty]: cssValue },
				},
			});
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value.trim();
		updateCSSValue(value, selectedUnit);
	};

	const handleIncrease = () => {
		if (selectedLayer) {
			const newValue = (numericValue || defaultValue) + step;
			updateCSSValue(newValue, selectedUnit);
		}
	};

	const handleDecrease = () => {
		if (selectedLayer) {
			const newValue = (numericValue || defaultValue) - step;
			updateCSSValue(newValue, selectedUnit);
		}
	};

	const handleClear = () => {
		if (selectedLayer) {
			designerAction({
				type: "UPDATE_LAYER_CSS",
				payload: { id: selectedLayer.id, css: { [cssProperty]: "" } },
			});
		}
	};

	const handleUnitChange = (newUnit: string) => {
		setSelectedUnit(newUnit);
		// Update the CSS value with the new unit
		if (rawValue) {
			updateCSSValue(numericValue, newUnit);
		}
	};

	// Convert numeric value to string for input
	const inputValue =
		numericValue === 0 && !rawValue ? "" : numericValue.toString();

	// Convert units array to select items format
	const unitItems = units.map((unit) => ({ label: unit, value: unit }));

	return (
		<DesignAction label={label} orientation={orientation}>
			<div className="flex items-center gap-1">
				<InputGroup
					value={inputValue}
					onChange={handleInputChange}
					addon={addon}
				/>
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
			<Button
				onClick={handleClear}
				className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md font-medium text-xs leading-none transition-all focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[4px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 bg-input text-input-foreground hover:bg-input/80 size-7 justify-center p-0 active:scale-95 [&_svg:not([class*='size-'])]:size-3.5"
			>
				<IconX />
			</Button>
		</DesignAction>
	);
};
