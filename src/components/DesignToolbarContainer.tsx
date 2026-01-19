import {
	IconArrowBackUp,
	IconArrowForwardUp,
	IconPalette,
} from "@tabler/icons-react";
import { useDesignerAction } from "../hooks/useDesignerAction";
import { useHistory } from "../hooks/useHistory";
import { DesignerToolbar } from "./DesignerToolbar";
import { DesignerToolbarButton } from "./DesignerToolbarButton";
import { DesignerToolbarGroup } from "./DesignerToolbarGroup";
import { DesignerToolbarSeparator } from "./DesignerToolbarSeparator";
import { ZoomControl } from "./ZoomControl";

export const DesignToolbarContainer = () => {
	const designerAction = useDesignerAction();
	const { canUndo, canRedo } = useHistory();

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

			<DesignerToolbarSeparator />
			<DesignerToolbarGroup>
				<ZoomControl />
			</DesignerToolbarGroup>
		</DesignerToolbar>
	);
};
