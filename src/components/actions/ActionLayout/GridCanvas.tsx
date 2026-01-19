import { Button } from "@base-ui/react/button";
import { useMemo, useState } from "react";

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

	const handleColChange = (newCount: number) => {
		const clampedCount = Math.max(1, Math.min(12, newCount));
		setColCount(clampedCount);
		onChange(`repeat(${clampedCount}, 1fr)`, rows);
	};

	const handleRowChange = (newCount: number) => {
		const clampedCount = Math.max(1, Math.min(12, newCount));
		setRowCount(clampedCount);
		onChange(columns, `repeat(${clampedCount}, 1fr)`);
	};

	return (
		<div className="flex flex-col gap-3">
			{/* Grid Structure Controls */}
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between gap-2">
					<label className="text-xs text-muted-foreground">Columns</label>
					<div className="flex items-center gap-1">
						<Button
							onClick={() => handleColChange(colCount - 1)}
							disabled={colCount <= 1}
							className="flex h-6 w-6 items-center justify-center rounded-sm bg-input text-xs hover:bg-input/80 disabled:opacity-30"
							aria-label="Decrease columns"
						>
							−
						</Button>
						<span className="w-8 text-center text-xs tabular-nums">
							{colCount}
						</span>
						<Button
							onClick={() => handleColChange(colCount + 1)}
							disabled={colCount >= 12}
							className="flex h-6 w-6 items-center justify-center rounded-sm bg-input text-xs hover:bg-input/80 disabled:opacity-30"
							aria-label="Increase columns"
						>
							+
						</Button>
					</div>
				</div>

				<div className="flex items-center justify-between gap-2">
					<label className="text-xs text-muted-foreground">Rows</label>
					<div className="flex items-center gap-1">
						<Button
							onClick={() => handleRowChange(rowCount - 1)}
							disabled={rowCount <= 1}
							className="flex h-6 w-6 items-center justify-center rounded-sm bg-input text-xs hover:bg-input/80 disabled:opacity-30"
							aria-label="Decrease rows"
						>
							−
						</Button>
						<span className="w-8 text-center text-xs tabular-nums">
							{rowCount}
						</span>
						<Button
							onClick={() => handleRowChange(rowCount + 1)}
							disabled={rowCount >= 12}
							className="flex h-6 w-6 items-center justify-center rounded-sm bg-input text-xs hover:bg-input/80 disabled:opacity-30"
							aria-label="Increase rows"
						>
							+
						</Button>
					</div>
				</div>
			</div>

			{/* Visual Grid Preview */}
			<div className="rounded-md border border-border/50 bg-background p-2">
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
							className="aspect-square rounded-sm border border-border/30 bg-input/30"
							aria-hidden="true"
						/>
					))}
				</div>
			</div>

			{/* Grid Template Values Display */}
			<div className="flex flex-col gap-1 rounded-md border border-border/30 bg-muted/20 p-2">
				<div className="text-[10px] text-muted-foreground">
					<code className="break-all">columns: {columns}</code>
				</div>
				<div className="text-[10px] text-muted-foreground">
					<code className="break-all">rows: {rows}</code>
				</div>
			</div>
		</div>
	);
};
