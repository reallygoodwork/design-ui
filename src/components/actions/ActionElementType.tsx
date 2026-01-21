import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useDesignerContext } from "../../hooks/useDesignerContext";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ClearButton } from "../common/ClearButton";
import { Select } from "../common/Select";
import { DesignAction } from "../DesignAction";

export const ActionElementType = () => {
	const selectedLayers = useSelectedLayers();
	const selectedLayer = selectedLayers[0];
	const designerAction = useDesignerAction();
	const { state } = useDesignerContext();

	if (!selectedLayer) return null;

	// Find the layer type definition
	const layerType = state.layerTypes.find(
		(lt) => lt.type === selectedLayer.type
	);

	// Only show if layer type has available element types
	if (
		!layerType ||
		!layerType.availableElementTypes ||
		layerType.availableElementTypes.length === 0
	) {
		return null;
	}

	// Get current value from layer or fallback to layerType default
	const currentValue = selectedLayer.elementType || layerType.elementType || "";

	// Convert element types to options
	const options = layerType.availableElementTypes.map((elementType) => ({
		label: elementType.charAt(0).toUpperCase() + elementType.slice(1),
		value: elementType,
	}));

	const handleValueChange = (value: string) => {
		designerAction({
			type: "UPDATE_LAYER_ELEMENT_TYPE",
			payload: {
				layerId: selectedLayer.id,
				elementType: value,
			},
		});
	};

	const handleClear = () => {
		if (selectedLayer.elementType) {
			designerAction({
				type: "UPDATE_LAYER_ELEMENT_TYPE",
				payload: {
					layerId: selectedLayer.id,
					elementType: layerType.elementType || "",
				},
			});
		}
	};

	const hasValue = Boolean(selectedLayer.elementType);

	return (
		<DesignAction label="Element Type" orientation="horizontal">
			<Select
				items={options}
				value={currentValue}
				onValueChange={handleValueChange}
			/>
			<ClearButton hasValue={hasValue} handleClear={handleClear} />
		</DesignAction>
	);
};
