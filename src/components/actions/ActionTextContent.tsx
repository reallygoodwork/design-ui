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
				className="field-sizing-content flex min-h-16 w-full break-all rounded-md border border-input bg-input px-3 py-2 text-base outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 sm:text-xs dark:bg-input/30 dark:aria-invalid:ring-destructive/40"
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
