import { Dialog } from "@base-ui/react/dialog";
import { useDesignerAction } from "../hooks/useDesignerAction";
import { useDesignerContext } from "../hooks/useDesignerContext";
import { useLayerTypes } from "../hooks/useLayerTypes";
import type { Layer } from "../lib/Types";

export const AddLayerDialog = () => {
	const { state } = useDesignerContext();
	const designerAction = useDesignerAction();
	const layerTypes = useLayerTypes();
	const dialogState = state.addLayerDialog;

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			designerAction({ type: "CLOSE_ADD_LAYER_DIALOG" });
		}
	};

	const handleLayerTypeSelect = (layerTypeId: string) => {
		if (!dialogState) return;

		const layerType = layerTypes.find((lt) => lt.type === layerTypeId);
		if (!layerType) return;

		// Generate a unique ID for the new layer
		const newLayerId = `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		// Create the new layer with default values
		const newLayer: Layer = {
			id: newLayerId,
			type: layerType.type,
			...layerType.defaultValues,
		};

		// Dispatch the ADD_LAYER action with position information
		designerAction({
			type: "ADD_LAYER",
			payload: {
				layer: newLayer,
				targetLayerId: dialogState.layerId,
				position: dialogState.position,
			},
		});

		// Select the newly created layer
		designerAction({
			type: "SELECT_LAYER",
			payload: { layerId: newLayerId, shiftKey: false },
		});

		handleOpenChange(false);
	};

	if (!dialogState) {
		return null;
	}

	return (
		<Dialog.Root open={dialogState.open} onOpenChange={handleOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
				<Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg">
					<Dialog.Title className="mb-4 text-lg font-semibold">
						Add Layer
					</Dialog.Title>
					<Dialog.Description className="mb-4 text-sm text-muted-foreground">
						Select a layer type to add{" "}
						{dialogState.position === "before"
							? "before"
							: dialogState.position === "after"
								? "after"
								: "inside"}{" "}
						the selected layer.
					</Dialog.Description>
					<div className="max-h-96 space-y-2 overflow-y-auto">
						{layerTypes.map((layerType) => (
							<button
								key={layerType.type}
								type="button"
								className="flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
								onClick={() => handleLayerTypeSelect(layerType.type)}
							>
								{layerType.icon && (
									<span className="shrink-0">{layerType.icon}</span>
								)}
								<div className="flex-1">
									<div className="font-medium">{layerType.name}</div>
									{layerType.type && (
										<div className="text-xs text-muted-foreground">
											{layerType.type}
										</div>
									)}
								</div>
							</button>
						))}
					</div>
					<div className="mt-6 flex justify-end">
						<Dialog.Close className="rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
							Cancel
						</Dialog.Close>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
