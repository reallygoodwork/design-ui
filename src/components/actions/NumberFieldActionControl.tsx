import { NumberField } from "@base-ui/react/number-field";
import { useMemo, useState } from "react";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { formatCSSValue, parseCSSValue } from "../../lib/cssValueHelpers";
import { ScrubField } from "../common/ScrubField";
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
	orientation = "horizontal",
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
		<DesignAction
			label={label}
			orientation={orientation}
			clear={
				externalOnClear || isSelfContained
					? { hasValue, onClear: handleClear }
					: undefined
			}
		>
			<div className="flex min-w-0 flex-1 items-center gap-1">
				<NumberField.Root
					value={currentValue}
					onValueChange={handleValueChange}
					min={min}
					max={max}
					step={step}
					className="flex w-full min-w-0 flex-1 items-center gap-1"
				>
					<NumberField.Group className="relative h-7 w-full rounded-md bg-input">
						<ScrubField
							value={currentValue}
							min={min}
							max={max}
							step={step}
							onChange={handleValueChange}
							className="h-full"
						>
							<NumberField.Input className="h-full w-full rounded-md bg-transparent px-2 text-foreground font-mono text-value outline-hidden focus-visible:ring-2 focus-visible:ring-ring" />
						</ScrubField>
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
		</DesignAction>
	);
};
