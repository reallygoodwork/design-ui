import { sortBreakpointsByWidth } from "@design-ui/core";
import type React from "react";
import { memo, useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDesignerContext } from "../hooks/useDesignerContext";
import { useDesignerSelector } from "../hooks/useDesignerSelector";
import { useFrameRegistry } from "../hooks/useFrameRegistry";
import { useLayer } from "../hooks/useLayer";
import { useLayers } from "../hooks/useLayers";
import { useLayerTypes } from "../hooks/useLayerTypes";
import { cn } from "../lib/cn";
import { applyCssVars, withoutTransitions } from "../lib/cssPropertyMapping";
import type { Breakpoint, CSSVars, Layer, LayerWithStyles } from "../lib/Types";
import { BreakpointHeader } from "./BreakpointHeader";
import { useTokenOverlayCss } from "./tokens/TokenStyles";

/**
 * Design content renders in a shadow root, so neither the editor's styles nor
 * a host app's reach it: what you see is how it renders anywhere else.
 * `all: initial` doesn't reset custom properties, so token values still
 * inherit from the host.
 *
 * On the canvas, content is for selecting, not reading or clicking: show the
 * arrow over every layer (no I-beam on text, no hand on links) and don't
 * highlight text while dragging a selection box. Editor-only; exports and
 * renders don't include this.
 */
const FRAME_BASE_CSS = `:host{all:initial;display:block;position:relative}
[data-slot="designer-frame"]{position:absolute;inset:0}
[data-slot="designer-frame"],[data-slot="designer-frame"] *{cursor:default!important;-webkit-user-select:none;user-select:none}`;

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
	const effectiveCssVars = withoutTransitions(
		sortedBreakpoints.length > 0
			? getEffectiveStylesSorted(layer, breakpointId, sortedBreakpoints)
			: (layer.cssVars ?? {})
	);

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
		layer.children && layer.children.length > 0
			? layer.children.map((child) => (
					<DesignerLayer
						key={child.id}
						id={child.id}
						breakpointId={breakpointId}
					/>
				))
			: undefined;

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

	// The host gets an open shadow root; StrictMode mounts twice, so reuse it.
	const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
	const hostRef = useCallback((el: HTMLDivElement | null) => {
		if (el) setShadowRoot(el.shadowRoot ?? el.attachShadow({ mode: "open" }));
	}, []);
	const overlayCss = useTokenOverlayCss();

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
		// Only select the breakpoint when the click hit the frame itself, not a
		// layer. Targets inside the shadow root read as the host, so check the
		// real one.
		const hit = e.nativeEvent.composedPath()[0];
		if (hit instanceof Element && hit.matches('[data-slot="designer-frame"]')) {
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
				style={{ width: breakpoint.width, height: breakpoint.height }}
				ref={hostRef}
				onClick={handleContentClick}
			>
				{shadowRoot &&
					createPortal(
						<>
							<style>{FRAME_BASE_CSS + overlayCss}</style>
							<div
								ref={contentRef}
								data-slot="designer-frame"
								data-breakpoint-id={breakpoint.id}
								style={{
									// Shared frame styles (like <body>), as real properties so
									// inheritable ones (font, color) cascade to layers
									...applyCssVars(frameStyleVars),
									backgroundColor:
										frameStyleVars?.["--background-color"] || "#ffffff",
									color: frameStyleVars?.["--color"] || "#000000",
								}}
							>
								{layers.map((layer) => (
									<DesignerLayer
										key={layer.id}
										id={layer.id}
										breakpointId={breakpoint.id}
									/>
								))}
							</div>
						</>,
						shadowRoot
					)}
			</div>
		</div>
	);
};
