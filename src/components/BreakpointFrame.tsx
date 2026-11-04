import type React from "react";
import { memo, useCallback, useRef } from "react";
import { useDesignerContext } from "../hooks/useDesignerContext";
import { useDesignerSelector } from "../hooks/useDesignerSelector";
import { useFrameRegistry } from "../hooks/useFrameRegistry";
import { useLayer } from "../hooks/useLayer";
import { useLayers } from "../hooks/useLayers";
import { useLayerTypes } from "../hooks/useLayerTypes";
import { sortBreakpointsByWidth } from "../lib/breakpointUtils";
import { cn } from "../lib/cn";
import { applyCssVars } from "../lib/cssPropertyMapping";
import type { Breakpoint, CSSVars, Layer, LayerWithStyles } from "../lib/Types";
import { BreakpointHeader } from "./BreakpointHeader";

const sortedCache = new WeakMap<Breakpoint[], Breakpoint[]>();

/** Breakpoints sorted by width, computed once per breakpoints array. */
const selectSortedBreakpoints = (state: {
	breakpoints: Breakpoint[];
}): Breakpoint[] => {
	let sorted = sortedCache.get(state.breakpoints);
	if (!sorted) {
		sorted = sortBreakpointsByWidth(state.breakpoints);
		sortedCache.set(state.breakpoints, sorted);
	}
	return sorted;
};

/**
 * Mobile-first cascade, same as `getEffectiveStyles` but over breakpoints that
 * are already sorted.
 */
const getEffectiveStylesSorted = (
	layer: Layer,
	breakpointId: string,
	sorted: Breakpoint[]
): CSSVars => {
	const targetIndex = sorted.findIndex((bp) => bp.id === breakpointId);
	let effective: CSSVars = { ...layer.cssVars };
	if (targetIndex === -1) {
		return effective;
	}
	for (let i = 1; i <= targetIndex; i++) {
		const overrides = layer.breakpointCssVars?.[sorted[i].id];
		if (overrides) {
			effective = { ...effective, ...overrides };
		}
	}
	return effective;
};

/**
 * Renders a single layer with breakpoint-specific styles. Memoised over
 * `{id, breakpointId}` and subscribed to its own layer, so editing one layer
 * only re-renders it and its ancestors.
 */
const DesignerLayer = memo(function DesignerLayerView({
	id,
	breakpointId,
}: {
	id: string;
	breakpointId: string;
}) {
	const layer = useLayer(id);
	const layerTypes = useLayerTypes();
	const sortedBreakpoints = useDesignerSelector(selectSortedBreakpoints);

	if (!layer) {
		return null;
	}

	const layerType = layerTypes.find((lt) => lt.type === layer.type);

	if (!layerType) {
		return null;
	}

	// Get the element type from layer, or fallback to layerType default
	const elementType = layer.elementType || layerType.elementType;

	// Get effective styles for this layer at this breakpoint (mobile-first cascade)
	const effectiveCssVars =
		sortedBreakpoints.length > 0
			? getEffectiveStylesSorted(layer, breakpointId, sortedBreakpoints)
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
		effectiveCssVars,
	};

	// Render nested children by id with the same breakpointId
	const children =
		layer.children && layer.children.length > 0 ? (
			<>
				{layer.children.map((child) => (
					<DesignerLayer
						key={child.id}
						id={child.id}
						breakpointId={breakpointId}
					/>
				))}
			</>
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
});

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
	const registry = useFrameRegistry();
	const breakpointId = breakpoint.id;

	// Register the content root so design-DOM queries go through the registry.
	// React 18 ref callbacks have no cleanup, so remember the element to unregister.
	const registeredRef = useRef<HTMLElement | null>(null);
	const contentRef = useCallback(
		(el: HTMLDivElement | null) => {
			if (registeredRef.current) {
				registry.unregister(breakpointId, registeredRef.current);
				registeredRef.current = null;
			}
			if (el) {
				registry.register(breakpointId, el);
				registeredRef.current = el;
			}
		},
		[registry, breakpointId]
	);

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
			{/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: keyboard users select a breakpoint from its section header in the layer tree */}
			<div
				className={cn(
					"breakpoint-content relative",
					isActive && !isSelected && "ring-1 ring-primary/30"
				)}
				style={{
					width: breakpoint.width,
					height: breakpoint.height,
					// Apply shared frame styles as real CSS properties so inheritable
					// ones (font, color, line-height) cascade to layers natively
					...applyCssVars(frameStyleVars),
					backgroundColor: frameStyleVars?.["--background-color"] || "#ffffff",
					color: frameStyleVars?.["--color"] || "#000000",
				}}
				ref={contentRef}
				onClick={handleContentClick}
				data-slot="designer-frame"
			>
				{/* Render layers - they inherit frame styles via CSS inheritance */}
				{layers.map((layer) => (
					<DesignerLayer
						key={layer.id}
						id={layer.id}
						breakpointId={breakpoint.id}
					/>
				))}
			</div>
		</div>
	);
};
