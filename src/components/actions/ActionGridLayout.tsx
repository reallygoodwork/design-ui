import { useMemo } from "react";
import {
	useBreakpointCssGroup,
	useEffectiveCss,
} from "../../hooks/useBreakpointCss";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { GridCanvas } from "./ActionLayout/GridCanvas";
import { ActionPopover } from "./ActionPopover";

const GRID_PROPERTIES = ["--grid-template-columns", "--grid-template-rows"];

export const ActionGridLayout = () => {
	const selectedLayers = useSelectedLayers();
	const designerAction = useDesignerAction();
	const selectedLayer = selectedLayers[0];

	// Get current grid values
	const vars = useEffectiveCss();
	const group = useBreakpointCssGroup(GRID_PROPERTIES);
	const display = vars["--display"];
	const gridColumns = vars["--grid-template-columns"] || "repeat(3, 1fr)";
	const gridRows = vars["--grid-template-rows"] || "repeat(3, 1fr)";

	// Parse grid structure to show in trigger
	const triggerDisplayValue = useMemo(() => {
		// Simple parsing - extract number of columns and rows from repeat() syntax
		const colMatch = gridColumns.match(/repeat\((\d+),/);
		const rowMatch = gridRows.match(/repeat\((\d+),/);

		const cols = colMatch ? colMatch[1] : gridColumns.split(" ").length;
		const rows = rowMatch ? rowMatch[1] : gridRows.split(" ").length;

		return `${cols}×${rows}`;
	}, [gridColumns, gridRows]);

	const handleGridChange = (columns: string, rows: string) => {
		if (selectedLayer) {
			designerAction({
				type: "UPDATE_LAYER_CSS",
				payload: {
					id: selectedLayer.id,
					css: {
						"--display": "grid",
						"--grid-template-columns": columns,
						"--grid-template-rows": rows,
					},
				},
			});
		}
	};

	const handleClear = () => {
		if (selectedLayer) {
			designerAction({
				type: "UPDATE_LAYER_CSS",
				payload: {
					id: selectedLayer.id,
					css: {
						"--grid-template-columns": "",
						"--grid-template-rows": "",
					},
				},
			});
		}
	};

	// Only show for grid display modes
	if (!selectedLayer || (display !== "grid" && display !== "inline-grid")) {
		return null;
	}

	return (
		<ActionPopover
			label="Grid Layout"
			popoverTitle="Grid layout"
			triggerDisplayValue={triggerDisplayValue}
			hasValue={group.hasExplicit}
			inherited={!group.isPrimary && group.isInherited}
			onClear={handleClear}
		>
			<GridCanvas
				columns={gridColumns}
				rows={gridRows}
				onChange={handleGridChange}
			/>
		</ActionPopover>
	);
};
