import { useMemo } from "react";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { GridCanvas } from "./ActionLayout/GridCanvas";
import { ActionPopover } from "./ActionPopover";

export const ActionGridLayout = () => {
	const selectedLayers = useSelectedLayers();
	const designerAction = useDesignerAction();
	const selectedLayer = selectedLayers[0];

	// Get current grid values
	const gridColumns =
		selectedLayer?.cssVars?.["--grid-template-columns"] || "repeat(3, 1fr)";
	const gridRows =
		selectedLayer?.cssVars?.["--grid-template-rows"] || "repeat(3, 1fr)";

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

	const hasValue = Boolean(
		selectedLayer?.cssVars?.["--grid-template-columns"] ||
			selectedLayer?.cssVars?.["--grid-template-rows"]
	);

	// Only show for grid display modes
	if (
		!selectedLayer ||
		(selectedLayer.cssVars?.["--display"] !== "grid" &&
			selectedLayer.cssVars?.["--display"] !== "inline-grid")
	) {
		return null;
	}

	return (
		<ActionPopover
			label="Grid Layout"
			popoverTitle="Grid Layout"
			triggerDisplayValue={triggerDisplayValue}
			hasValue={hasValue}
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
