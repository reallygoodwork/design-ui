import { useMemo } from "react";
import { getEffectiveStyles } from "../lib/breakpointUtils";
import type { CSSVars, Layer } from "../lib/Types";
import { useDesignerContext } from "./useDesignerContext";

/**
 * Hook to compute effective styles for a layer at a specific breakpoint.
 * Used for rendering layers with proper style cascade.
 *
 * @param layer - The layer to get styles for
 * @param breakpointId - The breakpoint ID to compute styles for
 * @returns The computed CSS variables for rendering
 */
export const useBreakpointStyles = (
	layer: Layer,
	breakpointId: string
): CSSVars => {
	const { state } = useDesignerContext();

	const effectiveStyles = useMemo(() => {
		if (state.breakpoints.length === 0) {
			// No breakpoints, return base styles
			return layer.cssVars ?? {};
		}
		return getEffectiveStyles(layer, breakpointId, state.breakpoints);
	}, [layer, breakpointId, state.breakpoints]);

	return effectiveStyles;
};

/**
 * Hook to get the frame styles (document-level styles).
 * These are shared across all breakpoints.
 */
export const useFrameStylesRead = (): CSSVars => {
	const { state } = useDesignerContext();
	return state.frameStyles;
};
