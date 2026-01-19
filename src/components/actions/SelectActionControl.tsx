import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ClearButton } from "../common/ClearButton";
import { Select } from "../common/Select";
import { DesignAction } from "../DesignAction";

interface SelectItem {
	label: string;
	value: string;
}

interface SelectActionControlProps {
	cssProperty: string;
	label: string;
	options: readonly SelectItem[];
	defaultValue?: string;
	orientation?: "horizontal" | "vertical";
}

export const SelectActionControl = ({
	cssProperty,
	label,
	options,
	defaultValue = "",
	orientation = "vertical",
}: SelectActionControlProps) => {
	const selectedLayers = useSelectedLayers();
	const designerAction = useDesignerAction();
	const selectedLayer = selectedLayers[0];

	const currentValue = selectedLayer?.cssVars?.[cssProperty] || defaultValue;

	const handleValueChange = (value: string) => {
		if (selectedLayer) {
			designerAction({
				type: "UPDATE_LAYER_CSS",
				payload: {
					id: selectedLayer.id,
					css: { [cssProperty]: value },
				},
			});
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

	const hasValue = Boolean(selectedLayer?.cssVars?.[cssProperty]);

	return (
		<DesignAction label={label} orientation={orientation}>
			<Select
				items={options}
				value={currentValue}
				onValueChange={handleValueChange}
			/>
			<ClearButton hasValue={hasValue} handleClear={handleClear} />
		</DesignAction>
	);
};
