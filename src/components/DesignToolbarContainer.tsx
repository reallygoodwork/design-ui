import { acceptsChildren } from "@design-ui/core";
import {
	IconArrowBackUp,
	IconArrowForwardUp,
	IconMessagePlus,
	IconPlus,
} from "@tabler/icons-react";
import { useAllowed } from "../hooks/useAllowed";
import { useAnnotations } from "../hooks/useAnnotations";
import { useDesignerAction } from "../hooks/useDesignerAction";
import { useHistory } from "../hooks/useHistory";
import { useLayerTypes } from "../hooks/useLayerTypes";
import { useSelectedLayers } from "../hooks/useSelectedLayers";
import { DesignerToolbar } from "./DesignerToolbar";
import { DesignerToolbarButton } from "./DesignerToolbarButton";
import { DesignerToolbarGroup } from "./DesignerToolbarGroup";
import { DesignerToolbarSeparator } from "./DesignerToolbarSeparator";
import { ZoomControl } from "./ZoomControl";

export const DesignToolbarContainer = () => {
	const designerAction = useDesignerAction();
	const { canUndo, canRedo } = useHistory();
	const { commentMode, setCommentMode } = useAnnotations();
	const selectedLayers = useSelectedLayers();
	const layerTypes = useLayerTypes();
	const limits = useAllowed(
		selectedLayers.length === 1 ? selectedLayers[0].id : undefined
	);
	// Adding needs one place to add to: a single selected layer that holds others.
	const container =
		selectedLayers.length === 1 &&
		layerTypes.find((type) => type.type === selectedLayers[0].type)
			?.supportsChildren &&
		acceptsChildren(limits)
			? selectedLayers[0]
			: null;

	return (
		<DesignerToolbar>
			<DesignerToolbarGroup>
				<DesignerToolbarButton
					hint="Undo"
					isDisabled={!canUndo}
					onClick={() => {
						designerAction({ type: "UNDO" });
					}}
				>
					<IconArrowBackUp />
				</DesignerToolbarButton>
				<DesignerToolbarButton
					hint="Redo"
					isDisabled={!canRedo}
					onClick={() => {
						designerAction({ type: "REDO" });
					}}
				>
					<IconArrowForwardUp />
				</DesignerToolbarButton>
			</DesignerToolbarGroup>

			{container && (
				<>
					<DesignerToolbarSeparator />
					<DesignerToolbarGroup>
						<DesignerToolbarButton
							hint={`Add layer inside ${container.name}`}
							onClick={() =>
								designerAction({
									type: "OPEN_ADD_LAYER_DIALOG",
									payload: { layerId: container.id, position: "inside" },
								})
							}
						>
							<IconPlus />
						</DesignerToolbarButton>
					</DesignerToolbarGroup>
				</>
			)}

			<DesignerToolbarSeparator />
			<DesignerToolbarGroup>
				<DesignerToolbarButton
					hint={commentMode ? "Stop commenting (C)" : "Comment (C)"}
					isActive={commentMode}
					onClick={() => setCommentMode(!commentMode)}
				>
					<IconMessagePlus />
				</DesignerToolbarButton>
			</DesignerToolbarGroup>

			<DesignerToolbarSeparator />
			<DesignerToolbarGroup>
				<ZoomControl />
			</DesignerToolbarGroup>
		</DesignerToolbar>
	);
};
