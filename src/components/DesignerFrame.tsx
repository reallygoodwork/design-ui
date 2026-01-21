import { useDesignerContext } from "../hooks/useDesignerContext";
import { calculateBoundingBox } from "../lib/breakpointUtils";
import { BreakpointFrame } from "./BreakpointFrame";

/**
 * Renders all breakpoint frames on the canvas.
 * Each breakpoint frame contains the same layer tree with breakpoint-specific styles.
 */
export const DesignerFrame = () => {
	const { state } = useDesignerContext();

	// If no breakpoints defined, render nothing
	if (state.breakpoints.length === 0) {
		return null;
	}

	// Calculate bounding box to size the container
	const boundingBox = calculateBoundingBox(state.breakpoints);
	// Add padding around the bounding box for headers and spacing
	const padding = 100;

	return (
		<div
			className="designer-frame"
			style={{
				position: "relative",
				width: boundingBox.width + boundingBox.x + padding,
				height: boundingBox.height + boundingBox.y + padding,
				minWidth: boundingBox.width + boundingBox.x + padding,
				minHeight: boundingBox.height + boundingBox.y + padding,
			}}
		>
			{state.breakpoints.map((breakpoint) => (
				<BreakpointFrame
					key={breakpoint.id}
					breakpoint={breakpoint}
					isActive={state.activeBreakpointId === breakpoint.id}
					isSelected={state.selectedBreakpointId === breakpoint.id}
				/>
			))}
		</div>
	);
};
