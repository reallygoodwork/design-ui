import type React from "react";
import { useDesignerContext } from "../hooks/useDesignerContext";
import { useLayers } from "../hooks/useLayers";
import { getEffectiveStyles } from "../lib/breakpointUtils";
import { cn } from "../lib/cn";
import type { Breakpoint, Layer, LayerWithStyles } from "../lib/Types";
import { BreakpointHeader } from "./BreakpointHeader";

/**
 * Renders a single layer with breakpoint-specific styles.
 */
const DesignerLayer = ({
	layer,
	breakpointId,
	state,
}: {
	layer: Layer;
	breakpointId: string;
	state: ReturnType<typeof useDesignerContext>["state"];
}) => {
	const layerType = state.layerTypes.find((lt) => lt.type === layer.type);

	if (!layerType) {
		return null;
	}

	// Get the element type from layer, or fallback to layerType default
	const elementType = layer.elementType || layerType.elementType;

	// Get effective styles for this layer at this breakpoint (mobile-first cascade)
	const effectiveCssVars =
		state.breakpoints.length > 0
			? getEffectiveStyles(layer, breakpointId, state.breakpoints)
			: (layer.cssVars ?? {});

	// Determine if layer has explicit dimensions
	const hasWidth = effectiveCssVars["--width"];
	const hasHeight = effectiveCssVars["--height"];

	// Build styles for the wrapper div (what Moveable targets)
	const wrapperStyle: React.CSSProperties = {};

	// Only apply width/height if they're explicitly set
	// Otherwise, let the content determine the size (block elements will take full width)
	if (hasWidth) {
		wrapperStyle.width = hasWidth;
	}
	if (hasHeight) {
		wrapperStyle.height = hasHeight;
	}

	const layerWithStyles: LayerWithStyles = {
		...layer,
		style: {
			// Content styles - let the rendered content use its natural sizing
			// unless dimensions are explicitly set
			...(hasWidth && { width: hasWidth }),
			...(hasHeight && { height: hasHeight }),
		},
		contentStyle: {
			...effectiveCssVars,
		},
	};

	// Render nested children with the same breakpointId
	const children =
		layer.children && layer.children.length > 0 ? (
			<div>
				{layer.children.map((child) => (
					<DesignerLayer
						key={child.id}
						layer={child}
						breakpointId={breakpointId}
						state={state}
					/>
				))}
			</div>
		) : undefined;

	return (
		<div
			className="designer-layer"
			data-layer-id={layer.id}
			data-breakpoint-id={breakpointId}
			key={layer.id}
			style={wrapperStyle}
		>
			{layerType.render(layerWithStyles, children, elementType)}
		</div>
	);
};

export type BreakpointFrameProps = {
	breakpoint: Breakpoint;
	isActive: boolean;
	isSelected: boolean;
};

/**
 * Renders a single breakpoint frame on the canvas.
 * Contains the header and the white content area with layers.
 */
export const BreakpointFrame = ({
	breakpoint,
	isActive,
	isSelected,
}: BreakpointFrameProps) => {
	const { state, dispatch } = useDesignerContext();
	const layers = useLayers();

	// Frame styles are shared across all breakpoints (like <body> styles)
	const frameStyleVars = state.frameStyles;

	const handleContentClick = (e: React.MouseEvent) => {
		// Only select breakpoint if clicking on empty area (not on a layer)
		if (e.target === e.currentTarget) {
			dispatch({
				type: "SELECT_BREAKPOINT",
				payload: { breakpointId: breakpoint.id },
			});
		}
	};

	return (
		<div
			className={cn(
				"breakpoint-frame absolute",
				isSelected && "ring-2 ring-primary ring-offset-2"
			)}
			style={{
				left: breakpoint.position.x,
				top: breakpoint.position.y,
			}}
			data-breakpoint-id={breakpoint.id}
			data-active={isActive}
			data-selected={isSelected}
		>
			<BreakpointHeader
				breakpoint={breakpoint}
				isActive={isActive}
				isSelected={isSelected}
			/>
			<button
				type="button"
				className={cn(
					"breakpoint-content relative",
					isActive && !isSelected && "ring-1 ring-primary/30"
				)}
				style={{
					width: breakpoint.width,
					height: breakpoint.height,
					// Apply shared frame styles as CSS variables on the content container
					// These inherit to all layers unless overridden
					...frameStyleVars,
					backgroundColor: frameStyleVars?.["--background-color"] || "#ffffff",
				}}
				onClick={handleContentClick}
				data-slot="designer-frame"
			>
				{/* Render layers - they inherit frame styles via CSS variables */}
				{layers.map((layer) => (
					<DesignerLayer
						key={layer.id}
						layer={layer}
						breakpointId={breakpoint.id}
						state={state}
					/>
				))}
			</button>
		</div>
	);
};
