import { Slider } from "@base-ui/react/slider";
import type { ReactNode } from "react";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ClearButton } from "../common/ClearButton";
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
	orientation = "vertical",
	addon = "",
}: SliderActionControlProps) => {
	const selectedLayers = useSelectedLayers();
	const designerAction = useDesignerAction();
	const selectedLayer = selectedLayers[0];

	const rawValue = selectedLayer?.cssVars?.[cssProperty];

	// Parse numeric value (no units)
	const numericValue = rawValue ? parseFloat(rawValue) : defaultValue;
	const validValue = Number.isNaN(numericValue) ? defaultValue : numericValue;

	// Update CSS property with new value
	const updateCSSValue = (value: number | string) => {
		if (selectedLayer) {
			const cssValue = value === "" ? "" : `${value}`;
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
		updateCSSValue(value);
	};

	const handleSliderChange = (value: number | number[]) => {
		const newValue = Array.isArray(value) ? value[0] : value;
		updateCSSValue(newValue);
	};

	const handleClear = () => {
		if (selectedLayer) {
			designerAction({
				type: "UPDATE_LAYER_CSS",
				payload: { id: selectedLayer.id, css: { [cssProperty]: "" } },
			});
		}
	};

	// Convert numeric value to string for input
	const inputValue = validValue === 0 && !rawValue ? "" : validValue.toString();

	const hasValue = Boolean(selectedLayer?.cssVars?.[cssProperty]);

	return (
		<DesignAction label={label} orientation={orientation}>
			<div className="flex items-center gap-1">
				<InputGroup
					value={inputValue}
					onChange={handleInputChange}
					addon={addon}
				/>
			</div>
			<Slider.Root
				value={[validValue]}
				onValueChange={handleSliderChange}
				min={min}
				max={max}
				step={step}
			>
				<Slider.Control className="flex w-16 touch-none items-center py-3 select-none pr-2">
					<Slider.Track className="h-1 w-full rounded bg-input select-none">
						<Slider.Indicator className="rounded bg-blue-600 select-none" />
						<Slider.Thumb
							aria-label={label}
							className="size-2.5 rounded bg-white outline outline-gray-300 select-none has-focus-visible:outline-2 has-focus-visible:outline-blue-800"
						/>
					</Slider.Track>
				</Slider.Control>
			</Slider.Root>

			<ClearButton hasValue={hasValue} handleClear={handleClear} />
		</DesignAction>
	);
};
