import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { FlexboxAlignmentGrid } from "./ActionLayout/FlexboxAlignmentGrid";
import { GridBuilderPopover } from "./ActionLayout/GridBuilderPopover";

export const ActionLayout = () => {
	const selectedLayers = useSelectedLayers();
	const designerAction = useDesignerAction();
	const selectedLayer = selectedLayers[0];

	// Determine current display mode
	const displayMode = selectedLayer?.cssVars?.["--display"] || "flex";
	const isGridMode = displayMode === "grid";

	const handleClear = () => {
		if (selectedLayer) {
			const cssToReset: Record<string, string> = {
				"--display": "",
				"--justify-content": "",
				"--align-items": "",
			};

			// Add grid-specific properties to reset if in grid mode
			if (isGridMode) {
				cssToReset["--grid-template-columns"] = "";
				cssToReset["--grid-template-rows"] = "";
				cssToReset["--gap"] = "";
			}

			designerAction({
				type: "UPDATE_LAYER_CSS",
				payload: {
					id: selectedLayer.id,
					css: cssToReset,
				},
			});
		}
	};

	// Determine if component has any value set
	const hasValue = Boolean(
		selectedLayer?.cssVars?.["--display"] ||
			selectedLayer?.cssVars?.["--justify-content"] ||
			selectedLayer?.cssVars?.["--align-items"] ||
			selectedLayer?.cssVars?.["--grid-template-columns"] ||
			selectedLayer?.cssVars?.["--grid-template-rows"]
	);

	return (
		<>
			{isGridMode ? (
				<GridBuilderPopover
					selectedLayer={selectedLayer}
					hasValue={hasValue}
					onClear={handleClear}
				/>
			) : (
				<FlexboxAlignmentGrid
					selectedLayer={selectedLayer}
					hasValue={hasValue}
					onClear={handleClear}
				/>
			)}
		</>
	);
};
