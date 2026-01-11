import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";

export const ActionFill = () => {
	const selectedLayers = useSelectedLayers();
	const designerAction = useDesignerAction();
	const selectedLayer = selectedLayers[0];

	const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (selectedLayer) {
			designerAction({
				type: "UPDATE_LAYER_CSS",
				payload: {
					id: selectedLayer.id,
					css: { "--background-color": e.target.value },
				},
			});
		}
	};

	return (
		<div>
			<div className="flex items-center justify-between mb-2">
				<label htmlFor="fill">Fill</label>
				<input
					id="fill"
					type="color"
					value={selectedLayer?.cssVars?.["--background-color"] || "#ffffff"}
					onChange={handleColorChange}
					className="w-24 p-1 border border-gray-300 rounded"
				/>
			</div>
		</div>
	);
};
