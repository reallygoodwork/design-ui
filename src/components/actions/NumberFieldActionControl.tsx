import { NumberField } from "@base-ui/react/number-field";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { formatCSSValue, parseCSSValue } from "../../lib/cssValueHelpers";
import { ClearButton } from "../common/ClearButton";
import { Select } from "../common/Select";
import { DesignAction } from "../DesignAction";

interface NumberFieldActionControlProps {
	label: string;
	defaultValue?: number;
	min?: number;
	max?: number;
	step?: number;
	orientation?: "horizontal" | "vertical";
	// For self-contained mode (uses designer context)
	cssProperty?: string;
	units?: readonly string[];
	defaultUnit?: string;
	// For controlled mode (external state management)
	value?: number;
	onValueChange?: (value: number | null) => void;
	hasValue?: boolean;
	onClear?: () => void;
}

export const NumberFieldActionControl = ({
	label,
	defaultValue = 0,
	min,
	max,
	step = 1,
	orientation = "vertical",
	cssProperty,
	units,
	defaultUnit = "px",
	value,
	onValueChange,
	hasValue: externalHasValue,
	onClear: externalOnClear,
}: NumberFieldActionControlProps) => {
	const selectedLayers = useSelectedLayers();
	const designerAction = useDesignerAction();
	const selectedLayer = selectedLayers[0];

	// Determine if controlled or self-contained mode
	const isControlled = value !== undefined && onValueChange !== undefined;
	const isSelfContained = cssProperty !== undefined;

	// Self-contained mode: parse CSS value
	const rawValue = isSelfContained
		? selectedLayer?.cssVars?.[cssProperty]
		: undefined;
	const { value: numericValue, unit: currentUnit } = useMemo(() => {
		if (!isSelfContained || !rawValue)
			return { value: defaultValue, unit: defaultUnit };
		return parseCSSValue(rawValue, defaultUnit);
	}, [rawValue, defaultValue, defaultUnit, isSelfContained]);

	// Local state for unit (to allow changing unit independently)
	const [selectedUnit, setSelectedUnit] = useState(currentUnit);

	// Self-contained mode: update CSS value
	const updateCSSValue = (newValue: number | null, unit: string) => {
		if (selectedLayer && cssProperty) {
			const cssValue = formatCSSValue(newValue ?? defaultValue, unit);
			designerAction({
				type: "UPDATE_LAYER_CSS",
				payload: {
					id: selectedLayer.id,
					css: { [cssProperty]: cssValue },
				},
			});
		}
	};

	const handleValueChange = (newValue: number | null) => {
		if (isControlled && onValueChange) {
			// Controlled mode
			onValueChange(newValue);
		} else if (isSelfContained) {
			// Self-contained mode
			updateCSSValue(newValue, selectedUnit);
		}
	};

	const handleClear = () => {
		if (externalOnClear) {
			// Controlled mode
			externalOnClear();
		} else if (selectedLayer && cssProperty) {
			// Self-contained mode
			designerAction({
				type: "UPDATE_LAYER_CSS",
				payload: { id: selectedLayer.id, css: { [cssProperty]: "" } },
			});
		}
	};

	const handleUnitChange = (newUnit: string) => {
		setSelectedUnit(newUnit);
		// Update the CSS value with the new unit
		if (isSelfContained && rawValue) {
			updateCSSValue(numericValue, newUnit);
		}
	};

	const hasValue = isSelfContained
		? Boolean(selectedLayer?.cssVars?.[cssProperty])
		: (externalHasValue ?? false);

	const currentValue = isControlled ? (value ?? defaultValue) : numericValue;

	// Convert units array to select items format
	const unitItems = units
		? units.map((unit) => ({ label: unit, value: unit }))
		: [];

	return (
		<DesignAction label={label} orientation={orientation}>
			<div className="flex items-center gap-1">
				<NumberField.Root
					value={currentValue}
					onValueChange={handleValueChange}
					min={min}
					max={max}
					step={step}
					className="flex items-center gap-1"
				>
					<NumberField.Group className="inline-flex items-center gap-1 whitespace-nowrap rounded-md font-medium text-xs leading-none transition-all focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[4px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-3.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 bg-input text-input-foreground hover:bg-input/80 h-7 px-2 py-1 has-[>svg]:px-2 border border-input">
						<NumberField.Decrement className="flex items-center justify-center p-0 size-3.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:hover:text-muted-foreground">
							<IconMinus />
						</NumberField.Decrement>
						<NumberField.Input className="w-12 bg-transparent text-center text-foreground text-xs tabular-nums outline-hidden placeholder:text-muted-foreground" />
						<NumberField.Increment className="flex items-center justify-center p-0 size-3.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:hover:text-muted-foreground">
							<IconPlus />
						</NumberField.Increment>
					</NumberField.Group>
				</NumberField.Root>
				{units && units.length > 0 && (
					<Select
						items={unitItems}
						value={selectedUnit}
						onValueChange={handleUnitChange}
						className="w-full max-w-13"
					/>
				)}
			</div>
			<ClearButton hasValue={hasValue} handleClear={handleClear} />
		</DesignAction>
	);
};
