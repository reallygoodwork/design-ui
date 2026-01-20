import { useMemo } from "react";
import type { Layer } from "../lib/Types";

/**
 * Hook to get the computed dimensions of a layer element.
 * Reads the actual rendered width and height from the DOM.
 *
 * @param layer - The layer to get dimensions for
 * @returns Object with width and height in pixels (rounded), or null if element not found
 */
export const useLayerDimensions = (layer: Layer | undefined) => {
	return useMemo(() => {
		if (!layer) {
			return null;
		}

		// Query the DOM element for this layer
		const element = document.querySelector(
			`.designer-frame .designer-layer[data-layer-id="${layer.id}"]`
		) as HTMLElement | null;

		if (!element) {
			return null;
		}

		// Get computed dimensions using getBoundingClientRect
		const rect = element.getBoundingClientRect();

		return {
			width: Math.round(rect.width),
			height: Math.round(rect.height),
		};
	}, [layer?.id, layer?.cssVars]);
};
