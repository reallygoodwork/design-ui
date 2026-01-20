import { useMemo, useState } from "react";
import { NumberFieldActionControl } from "../NumberFieldActionControl";

interface GridCanvasProps {
	columns: string;
	rows: string;
	onChange: (columns: string, rows: string) => void;
}

export const GridCanvas = ({ columns, rows, onChange }: GridCanvasProps) => {
	// Parse current grid structure
	const parseGridValue = (value: string): number => {
		const repeatMatch = value.match(/repeat\((\d+),/);
		if (repeatMatch) return parseInt(repeatMatch[1], 10);

		// Count space-separated values
		const parts = value.trim().split(/\s+/);
		return parts.length;
	};

	const [colCount, setColCount] = useState(() => parseGridValue(columns));
	const [rowCount, setRowCount] = useState(() => parseGridValue(rows));

	// Generate grid cells for visualization
	const gridCells = useMemo(() => {
		const cells: number[] = [];
		for (let i = 0; i < colCount * rowCount; i++) {
			cells.push(i);
		}
		return cells;
	}, [colCount, rowCount]);

	const handleColChange = (newCount: number | null) => {
		const clampedCount = Math.max(1, Math.min(12, newCount ?? 1));
		setColCount(clampedCount);
		onChange(`repeat(${clampedCount}, 1fr)`, rows);
	};

	const handleRowChange = (newCount: number | null) => {
		const clampedCount = Math.max(1, Math.min(12, newCount ?? 1));
		setRowCount(clampedCount);
		onChange(columns, `repeat(${clampedCount}, 1fr)`);
	};

	return (
		<div className="flex flex-col gap-3">
			{/* Grid Structure Controls */}
			<div className="flex flex-col gap-2">
				<NumberFieldActionControl
					label="Columns"
					value={colCount}
					onValueChange={handleColChange}
					min={1}
					max={12}
					step={1}
					orientation="horizontal"
					hasValue={true}
				/>

				<NumberFieldActionControl
					label="Rows"
					value={rowCount}
					onValueChange={handleRowChange}
					min={1}
					max={12}
					step={1}
					orientation="horizontal"
					hasValue={true}
				/>
			</div>

			{/* Visual Grid Preview */}
			<div className="rounded-md border border-border/50 bg-input p-2">
				<div
					className="grid gap-1"
					style={{
						gridTemplateColumns: `repeat(${colCount}, 1fr)`,
						gridTemplateRows: `repeat(${rowCount}, 1fr)`,
					}}
				>
					{gridCells.map((index) => (
						<div
							key={index}
							className="aspect-square rounded-xs border border-border/30 bg-input min-w-2 min-h-4 w-full h-full max-h-6"
							aria-hidden="true"
						/>
					))}
				</div>
			</div>

			{/* Grid Template Values Display */}
			<div className="flex flex-col rounded-md border border-border bg-input p-2">
				<div className="text-[10px] text-code-foreground">
					<code className="break-all">columns: {columns}</code>
				</div>
				<div className="text-[10px] text-code-foreground">
					<code className="break-all">rows: {rows}</code>
				</div>
			</div>
		</div>
	);
};
