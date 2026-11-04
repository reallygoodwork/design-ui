import { useLayoutEffect, useState } from "react";
import type { Layer } from "../lib/Types";
import { useDesignerContext } from "./useDesignerContext";
import { useFrameRegistry } from "./useFrameRegistry";

type Dimensions = { width: number; height: number };

/**
 * Hook to get the layout dimensions of a layer element in the active
 * breakpoint's frame, in unzoomed CSS pixels. Kept current with a
 * `ResizeObserver`.
 *
 * @param layer - The layer to get dimensions for
 * @returns Object with width and height in pixels, or null if element not found
 */
export const useLayerDimensions = (layer: Layer | undefined) => {
	const { state } = useDesignerContext();
	const registry = useFrameRegistry();
	const layerId = layer?.id;
	const { activeBreakpointId, zoom } = state;
	const [dimensions, setDimensions] = useState<Dimensions | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: zoom triggers a re-measure
	useLayoutEffect(() => {
		const element = layerId
			? registry.queryLayer(activeBreakpointId, layerId)
			: null;
		if (!element) {
			setDimensions(null);
			return;
		}

		const measure = () => {
			// offsetWidth/Height ignore the canvas's CSS scale()
			const next = {
				width: Math.round(element.offsetWidth),
				height: Math.round(element.offsetHeight),
			};
			setDimensions((prev) =>
				prev && prev.width === next.width && prev.height === next.height
					? prev
					: next
			);
		};
		measure();

		if (typeof ResizeObserver === "undefined") {
			return;
		}
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		return () => observer.disconnect();
	}, [layerId, activeBreakpointId, zoom, registry]);

	return layerId ? dimensions : null;
};
