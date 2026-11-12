import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { DesignAction } from "../DesignAction";

export const ActionTextContent = () => {
	const selectedLayers = useSelectedLayers();
	const selectedLayer = selectedLayers[0];
	const designerAction = useDesignerAction();

	if (!selectedLayer || selectedLayer.type !== "text") return null;

	return (
		<DesignAction label="Text Content" orientation="vertical">
			<textarea
				className="field-sizing-content flex min-h-16 w-full [overflow-wrap:anywhere] rounded-md border border-input bg-input px-3 py-2 text-control outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 pointer-coarse:text-base dark:bg-input/30 dark:aria-invalid:ring-destructive/40"
				placeholder="Enter text content"
				value={selectedLayer?.value}
				onChange={(e) => {
					designerAction({
						type: "UPDATE_LAYER_VALUE",
						payload: { id: selectedLayer?.id, value: e.target.value },
					});
				}}
			/>
		</DesignAction>
	);
};
