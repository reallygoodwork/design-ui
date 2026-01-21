import {
	IconGripVertical,
	IconPlayerPlay,
	IconPlus,
} from "@tabler/icons-react";
import { useRef, useState } from "react";
import { useDesignerContext } from "../hooks/useDesignerContext";
import {
	isPrimaryBreakpoint,
	sortBreakpointsByWidth,
} from "../lib/breakpointUtils";
import { cn } from "../lib/cn";
import type { Breakpoint } from "../lib/Types";

export type BreakpointHeaderProps = {
	breakpoint: Breakpoint;
	isActive: boolean;
	isSelected: boolean;
};

/**
 * Header bar for a breakpoint frame showing name, dimensions, and controls.
 */
export const BreakpointHeader = ({
	breakpoint,
	isActive,
	isSelected,
}: BreakpointHeaderProps) => {
	const { state, dispatch } = useDesignerContext();
	const [isDragging, setIsDragging] = useState(false);
	const dragStartRef = useRef<{
		x: number;
		y: number;
		posX: number;
		posY: number;
	} | null>(null);

	const isPrimary = isPrimaryBreakpoint(breakpoint.id, state.breakpoints);

	const handleHeaderClick = () => {
		// Only select if not dragging
		if (!isDragging) {
			dispatch({
				type: "SELECT_BREAKPOINT",
				payload: { breakpointId: breakpoint.id },
			});
		}
	};

	const handleDragStart = (e: React.MouseEvent) => {
		// Only start drag from the grip handle or header area (not buttons)
		if ((e.target as HTMLElement).closest("button")) return;

		e.preventDefault();
		setIsDragging(true);
		dragStartRef.current = {
			x: e.clientX,
			y: e.clientY,
			posX: breakpoint.position.x,
			posY: breakpoint.position.y,
		};

		const handleMouseMove = (moveEvent: MouseEvent) => {
			if (!dragStartRef.current) return;

			const zoom = state.zoom;
			const deltaX = (moveEvent.clientX - dragStartRef.current.x) / zoom;
			const deltaY = (moveEvent.clientY - dragStartRef.current.y) / zoom;

			dispatch({
				type: "UPDATE_BREAKPOINT",
				payload: {
					id: breakpoint.id,
					updates: {
						position: {
							x: Math.round(dragStartRef.current.posX + deltaX),
							y: Math.round(dragStartRef.current.posY + deltaY),
						},
					},
				},
			});
		};

		const handleMouseUp = () => {
			setIsDragging(false);
			dragStartRef.current = null;
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
	};

	const handleAddBreakpoint = (e: React.MouseEvent) => {
		e.stopPropagation();

		// Find the rightmost edge of all existing breakpoints
		let rightmostX = 0;
		let topY = 0;
		for (const bp of state.breakpoints) {
			const rightEdge = bp.position.x + bp.width;
			if (rightEdge > rightmostX) {
				rightmostX = rightEdge;
				topY = bp.position.y; // Use the y position of the rightmost breakpoint
			}
		}

		// Position new breakpoint to the right with a gap
		const gap = 50;
		const newX = rightmostX + gap;
		const newY = topY;

		// Determine new breakpoint size based on current breakpoint or defaults
		const sortedBreakpoints = sortBreakpointsByWidth(state.breakpoints);
		const currentIndex = sortedBreakpoints.findIndex(
			(bp) => bp.id === breakpoint.id
		);
		const nextBreakpoint = sortedBreakpoints[currentIndex + 1];
		const newWidth = nextBreakpoint
			? Math.round((breakpoint.width + nextBreakpoint.width) / 2)
			: breakpoint.width + 200;
		const newHeight = nextBreakpoint
			? Math.round((breakpoint.height + nextBreakpoint.height) / 2)
			: breakpoint.height;

		const newBreakpoint: Breakpoint = {
			id: `breakpoint-${Date.now()}`,
			name: `Breakpoint ${state.breakpoints.length + 1}`,
			width: newWidth,
			height: newHeight,
			position: { x: newX, y: newY },
		};

		dispatch({
			type: "ADD_BREAKPOINT",
			payload: { breakpoint: newBreakpoint },
		});
	};

	return (
		<button
			type="button"
			className={cn(
				"breakpoint-header flex items-center gap-2 px-2 py-1 text-xs select-none",
				isActive || isSelected ? "text-primary" : "text-muted-foreground",
				isSelected && "bg-primary/10 rounded-t",
				isDragging ? "cursor-grabbing" : "cursor-grab"
			)}
			onClick={handleHeaderClick}
			onMouseDown={handleDragStart}
		>
			{/* Drag grip handle */}
			<IconGripVertical className="size-3.5 opacity-50 hover:opacity-100" />

			{/* Play/preview icon */}
			<IconPlayerPlay className="size-3.5 fill-current" />

			{/* Breakpoint name */}
			<span className="font-medium">{breakpoint.name}</span>

			{/* Primary badge */}
			{isPrimary && (
				<span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">
					Primary
				</span>
			)}

			{/* Spacer */}
			<span className="flex-1" />

			{/* Dimensions */}
			<span className="text-muted-foreground tabular-nums">
				{breakpoint.width} × {breakpoint.height}
			</span>

			{/* Add breakpoint button */}
			<button
				type="button"
				className="flex size-5 items-center justify-center rounded hover:bg-accent/50"
				onClick={handleAddBreakpoint}
				title="Add breakpoint"
			>
				<IconPlus className="size-3.5" />
			</button>
		</button>
	);
};
