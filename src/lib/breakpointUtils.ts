import type { Breakpoint, CSSVars, Layer } from "./Types";

/**
 * Sort breakpoints by width ascending (mobile-first order)
 */
export function sortBreakpointsByWidth(
	breakpoints: Breakpoint[]
): Breakpoint[] {
	return [...breakpoints].sort((a, b) => a.width - b.width);
}

/**
 * Get the primary (smallest) breakpoint
 */
export function getPrimaryBreakpoint(
	breakpoints: Breakpoint[]
): Breakpoint | undefined {
	const sorted = sortBreakpointsByWidth(breakpoints);
	return sorted[0];
}

/**
 * Check if a breakpoint is the primary (smallest) breakpoint
 */
export function isPrimaryBreakpoint(
	breakpointId: string,
	breakpoints: Breakpoint[]
): boolean {
	const primary = getPrimaryBreakpoint(breakpoints);
	return primary?.id === breakpointId;
}

/**
 * Compute effective styles for a layer at a specific breakpoint.
 * Styles cascade upward from smallest to largest breakpoint (mobile-first).
 *
 * @param layer - The layer to compute styles for
 * @param breakpointId - The target breakpoint ID
 * @param breakpoints - All available breakpoints
 * @returns The computed CSS variables for rendering
 */
export function getEffectiveStyles(
	layer: Layer,
	breakpointId: string,
	breakpoints: Breakpoint[]
): CSSVars {
	// Sort smallest to largest (mobile-first)
	const sortedBreakpoints = sortBreakpointsByWidth(breakpoints);
	const targetIndex = sortedBreakpoints.findIndex(
		(bp) => bp.id === breakpointId
	);

	if (targetIndex === -1) {
		// Breakpoint not found, return base styles
		return { ...layer.cssVars };
	}

	// Start with base styles (smallest breakpoint)
	let effectiveStyles: CSSVars = { ...layer.cssVars };

	// Apply overrides from each breakpoint up to and including target
	for (let i = 1; i <= targetIndex; i++) {
		const bpId = sortedBreakpoints[i].id;
		if (layer.breakpointCssVars?.[bpId]) {
			effectiveStyles = {
				...effectiveStyles,
				...layer.breakpointCssVars[bpId],
			};
		}
	}

	return effectiveStyles;
}

/**
 * Get the inherited value for a CSS property at a specific breakpoint.
 * Used for UI placeholder display to show where a value comes from.
 *
 * @param layer - The layer to check
 * @param breakpointId - The target breakpoint ID
 * @param cssProperty - The CSS property to look up
 * @param breakpoints - All available breakpoints
 * @returns The inherited value and which breakpoint it comes from
 */
export function getInheritedValue(
	layer: Layer,
	breakpointId: string,
	cssProperty: string,
	breakpoints: Breakpoint[]
): { value: string | undefined; fromBreakpointId: string | null } {
	const sortedBreakpoints = sortBreakpointsByWidth(breakpoints);
	const targetIndex = sortedBreakpoints.findIndex(
		(bp) => bp.id === breakpointId
	);

	if (targetIndex === -1) {
		return { value: undefined, fromBreakpointId: null };
	}

	// Walk backwards from the breakpoint before target to find where value comes from
	for (let i = targetIndex - 1; i >= 0; i--) {
		const bpId = sortedBreakpoints[i].id;
		const bpValue = layer.breakpointCssVars?.[bpId]?.[cssProperty];
		if (bpValue !== undefined) {
			return { value: bpValue, fromBreakpointId: bpId };
		}
	}

	// Check base cssVars (primary/smallest breakpoint)
	const baseValue = layer.cssVars?.[cssProperty];
	if (baseValue !== undefined) {
		return {
			value: baseValue,
			fromBreakpointId: sortedBreakpoints[0]?.id ?? null,
		};
	}

	return { value: undefined, fromBreakpointId: null };
}

/**
 * Check if a value is explicitly set at this breakpoint (not inherited).
 *
 * @param layer - The layer to check
 * @param breakpointId - The breakpoint ID to check
 * @param cssProperty - The CSS property to check
 * @param breakpoints - All available breakpoints
 * @returns True if the value is explicitly set at this breakpoint
 */
export function isExplicitValue(
	layer: Layer,
	breakpointId: string,
	cssProperty: string,
	breakpoints: Breakpoint[]
): boolean {
	const isPrimary = isPrimaryBreakpoint(breakpointId, breakpoints);

	if (isPrimary) {
		return layer.cssVars?.[cssProperty] !== undefined;
	}

	return layer.breakpointCssVars?.[breakpointId]?.[cssProperty] !== undefined;
}

/**
 * Get the effective value for a CSS property at a specific breakpoint.
 * This combines the explicit value check with inherited value lookup.
 *
 * @param layer - The layer to check
 * @param breakpointId - The breakpoint ID
 * @param cssProperty - The CSS property
 * @param breakpoints - All available breakpoints
 * @returns Object with value, whether it's explicit, and source breakpoint
 */
export function getPropertyValue(
	layer: Layer,
	breakpointId: string,
	cssProperty: string,
	breakpoints: Breakpoint[]
): {
	value: string | undefined;
	isExplicit: boolean;
	fromBreakpointId: string | null;
} {
	const isPrimary = isPrimaryBreakpoint(breakpointId, breakpoints);

	// Check if explicitly set at this breakpoint
	if (isPrimary) {
		const value = layer.cssVars?.[cssProperty];
		if (value !== undefined) {
			return { value, isExplicit: true, fromBreakpointId: breakpointId };
		}
	} else {
		const value = layer.breakpointCssVars?.[breakpointId]?.[cssProperty];
		if (value !== undefined) {
			return { value, isExplicit: true, fromBreakpointId: breakpointId };
		}
	}

	// Not explicit, get inherited value
	const inherited = getInheritedValue(
		layer,
		breakpointId,
		cssProperty,
		breakpoints
	);
	return {
		value: inherited.value,
		isExplicit: false,
		fromBreakpointId: inherited.fromBreakpointId,
	};
}

/**
 * Calculate bounding box that encompasses all breakpoint frames.
 * Used for zoom-to-fit calculations.
 */
export function calculateBoundingBox(breakpoints: Breakpoint[]): {
	x: number;
	y: number;
	width: number;
	height: number;
} {
	if (breakpoints.length === 0) {
		return { x: 0, y: 0, width: 0, height: 0 };
	}

	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;

	for (const bp of breakpoints) {
		minX = Math.min(minX, bp.position.x);
		minY = Math.min(minY, bp.position.y);
		maxX = Math.max(maxX, bp.position.x + bp.width);
		maxY = Math.max(maxY, bp.position.y + bp.height);
	}

	return {
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY,
	};
}
