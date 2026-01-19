import { useMemo } from "react";
import { useDesignerAction } from "../../../hooks/useDesignerAction";
import type { Layer } from "../../../lib/Types";
import { ActionPopover } from "../ActionPopover";
import { NumericActionControl } from "../NumericActionControl";
import { GridCanvas } from "./GridCanvas";

interface GridBuilderPopoverProps {
	selectedLayer: Layer | undefined;
	hasValue: boolean;
	onClear: () => void;
}

export const GridBuilderPopover = ({
	selectedLayer,
	hasValue,
	onClear,
}: GridBuilderPopoverProps) => {
	const designerAction = useDesignerAction();

	// Get current grid values
	const gridColumns =
		selectedLayer?.cssVars?.["--grid-template-columns"] || "repeat(3, 1fr)";
	const gridRows =
		selectedLayer?.cssVars?.["--grid-template-rows"] || "repeat(3, 1fr)";
	const gridGap = selectedLayer?.cssVars?.["--gap"] || "0px";

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

	return (
		<ActionPopover
			label="Layout"
			popoverTitle="Grid Layout"
			triggerDisplayValue={triggerDisplayValue}
			hasValue={hasValue}
			onClear={onClear}
		>
			<div className="flex flex-col gap-4">
				{/* Visual Grid Builder Canvas */}
				<GridCanvas
					columns={gridColumns}
					rows={gridRows}
					onChange={handleGridChange}
				/>

				{/* Grid Gap Control */}
				<NumericActionControl
					cssProperty="--gap"
					label="Gap"
					defaultValue={0}
					showSteppers={false}
					orientation="horizontal"
				/>
			</div>
		</ActionPopover>
	);
};
