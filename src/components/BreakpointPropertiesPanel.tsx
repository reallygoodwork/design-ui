import { Input } from "@base-ui/react/input";
import { useSelectedBreakpoint } from "../hooks/useActiveBreakpoint";
import { useDesignerContext } from "../hooks/useDesignerContext";
import { isPrimaryBreakpoint } from "../lib/breakpointUtils";
import { NumberFieldActionControl } from "./actions/NumberFieldActionControl";
import { DesignAction } from "./DesignAction";
import { DesignerPane } from "./DesignerPane";
import { FrameStylesPanel } from "./FrameStylesPanel";

/**
 * Properties panel shown when a breakpoint frame is selected.
 * Shows breakpoint settings and shared document styles.
 */
export const BreakpointPropertiesPanel = () => {
	const { state, dispatch } = useDesignerContext();
	const selectedBreakpoint = useSelectedBreakpoint();

	// Only show when a breakpoint is selected (not a layer)
	if (!selectedBreakpoint) {
		return null;
	}

	const isPrimary = isPrimaryBreakpoint(
		selectedBreakpoint.id,
		state.breakpoints
	);

	const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		dispatch({
			type: "UPDATE_BREAKPOINT",
			payload: {
				id: selectedBreakpoint.id,
				updates: { name: e.target.value },
			},
		});
	};

	const handleWidthChange = (value: number | null) => {
		if (value !== null && value > 0) {
			dispatch({
				type: "UPDATE_BREAKPOINT",
				payload: {
					id: selectedBreakpoint.id,
					updates: { width: value },
				},
			});
		}
	};

	const handleHeightChange = (value: number | null) => {
		if (value !== null && value > 0) {
			dispatch({
				type: "UPDATE_BREAKPOINT",
				payload: {
					id: selectedBreakpoint.id,
					updates: { height: value },
				},
			});
		}
	};

	const handlePositionXChange = (value: number | null) => {
		if (value !== null) {
			dispatch({
				type: "UPDATE_BREAKPOINT",
				payload: {
					id: selectedBreakpoint.id,
					updates: { position: { ...selectedBreakpoint.position, x: value } },
				},
			});
		}
	};

	const handlePositionYChange = (value: number | null) => {
		if (value !== null) {
			dispatch({
				type: "UPDATE_BREAKPOINT",
				payload: {
					id: selectedBreakpoint.id,
					updates: { position: { ...selectedBreakpoint.position, y: value } },
				},
			});
		}
	};

	const handleDelete = () => {
		if (state.breakpoints.length > 1) {
			dispatch({
				type: "DELETE_BREAKPOINT",
				payload: { id: selectedBreakpoint.id },
			});
		}
	};

	return (
		<>
			<DesignerPane title="Breakpoint">
				{/* Name */}
				<DesignAction label="Name">
					<Input
						value={selectedBreakpoint.name}
						onChange={handleNameChange}
						className="flex h-7 w-full min-w-0 rounded-md border border-input bg-input px-2 py-1 text-base outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground sm:text-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
					/>
				</DesignAction>

				{/* Size */}
				<NumberFieldActionControl
					label="Width"
					value={selectedBreakpoint.width}
					onValueChange={handleWidthChange}
					min={100}
					max={5000}
					step={10}
					hasValue={true}
				/>

				<NumberFieldActionControl
					label="Height"
					value={selectedBreakpoint.height}
					onValueChange={handleHeightChange}
					min={100}
					max={5000}
					step={10}
					hasValue={true}
				/>

				{/* Position */}
				<NumberFieldActionControl
					label="Position X"
					value={selectedBreakpoint.position.x}
					onValueChange={handlePositionXChange}
					step={10}
					hasValue={true}
				/>

				<NumberFieldActionControl
					label="Position Y"
					value={selectedBreakpoint.position.y}
					onValueChange={handlePositionYChange}
					step={10}
					hasValue={true}
				/>

				{/* Primary badge and delete */}
				<div className="flex items-center justify-between pt-2">
					{isPrimary ? (
						<span className="rounded bg-primary/20 px-2 py-1 text-xs font-medium text-primary">
							Primary Breakpoint
						</span>
					) : (
						<span />
					)}
					{!isPrimary && state.breakpoints.length > 1 && (
						<button
							type="button"
							className="text-xs text-destructive hover:underline"
							onClick={handleDelete}
						>
							Delete Breakpoint
						</button>
					)}
				</div>
			</DesignerPane>

			{/* Document Styles - shared across all breakpoints */}
			<FrameStylesPanel />
		</>
	);
};
