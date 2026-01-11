import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";

export const ActionImage = () => {
	const selectedLayers = useSelectedLayers();
	const designerAction = useDesignerAction();
	const selectedLayer = selectedLayers[0];

	const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (selectedLayer) {
			designerAction({
				type: "UPDATE_LAYER_VALUE",
				payload: {
					id: selectedLayer.id,
					value: e.target.value,
				},
			});
		}
	};

	return (
		<div>
			<div className="flex items-center justify-between mb-2">
				<label htmlFor="url">URL</label>
				<input
					id="url"
					type="text"
					value={selectedLayer?.value || ""}
					onChange={handleUrlChange}
					className="w-48 p-1 border border-gray-300 rounded"
				/>
			</div>
		</div>
	);
};
