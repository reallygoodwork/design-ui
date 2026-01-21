import { useCallback, useMemo } from "react";
import { getPropertyValue, isPrimaryBreakpoint } from "../lib/breakpointUtils";
import { useDesignerContext } from "./useDesignerContext";
import { useSelectedLayers } from "./useSelectedLayers";

export type BreakpointCssValue = {
	/**
	 * The current effective value for display.
	 */
	value: string | undefined;
	/**
	 * The inherited value (from smaller breakpoint) for placeholder display.
	 */
	inheritedValue: string | undefined;
	/**
	 * Whether this value is explicitly set at this breakpoint (not inherited).
	 */
	isExplicit: boolean;
	/**
	 * Which breakpoint the value comes from (for "Inherited from X" display).
	 */
	fromBreakpointId: string | null;
	/**
	 * The name of the breakpoint the value comes from.
	 */
	fromBreakpointName: string | null;
	/**
	 * Whether we're at the primary (smallest) breakpoint.
	 */
	isPrimary: boolean;
	/**
	 * Set the value at the current breakpoint.
	 */
	setValue: (value: string) => void;
	/**
	 * Clear the value at the current breakpoint.
	 * On primary: removes value entirely.
	 * On non-primary: removes override, reverts to inherited.
	 */
	clearValue: () => void;
};

/**
 * Hook for action controls to read/write CSS values with breakpoint awareness.
 * Handles the mobile-first cascade and inherited value logic.
 *
 * @param cssProperty - The CSS property to manage (e.g., "--font-size")
 * @returns Object with value, inheritance info, and setter functions
 */
export const useBreakpointCss = (cssProperty: string): BreakpointCssValue => {
	const { state, dispatch } = useDesignerContext();
	const selectedLayers = useSelectedLayers();
	const selectedLayer = selectedLayers[0];

	const activeBreakpointId = state.activeBreakpointId;
	const breakpoints = state.breakpoints;

	// Compute value and inheritance info
	const valueInfo = useMemo(() => {
		if (!selectedLayer || !activeBreakpointId || breakpoints.length === 0) {
			// Fallback: use base cssVars directly
			const value = selectedLayer?.cssVars?.[cssProperty];
			return {
				value,
				inheritedValue: undefined,
				isExplicit: value !== undefined,
				fromBreakpointId: null,
				isPrimary: true,
			};
		}

		const propertyInfo = getPropertyValue(
			selectedLayer,
			activeBreakpointId,
			cssProperty,
			breakpoints
		);

		// For inherited values, get the inherited value for placeholder
		const inheritedValue = propertyInfo.isExplicit
			? undefined
			: propertyInfo.value;

		return {
			value: propertyInfo.value,
			inheritedValue,
			isExplicit: propertyInfo.isExplicit,
			fromBreakpointId: propertyInfo.fromBreakpointId,
			isPrimary: isPrimaryBreakpoint(activeBreakpointId, breakpoints),
		};
	}, [selectedLayer, activeBreakpointId, breakpoints, cssProperty]);

	// Get the name of the breakpoint the value comes from
	const fromBreakpointName = useMemo(() => {
		if (!valueInfo.fromBreakpointId) return null;
		const bp = breakpoints.find((b) => b.id === valueInfo.fromBreakpointId);
		return bp?.name ?? null;
	}, [valueInfo.fromBreakpointId, breakpoints]);

	// Set value at current breakpoint
	const setValue = useCallback(
		(value: string) => {
			if (!selectedLayer) return;

			dispatch({
				type: "UPDATE_LAYER_CSS",
				payload: {
					id: selectedLayer.id,
					css: { [cssProperty]: value },
					breakpointId: activeBreakpointId ?? undefined,
				},
			});
		},
		[selectedLayer, cssProperty, activeBreakpointId, dispatch]
	);

	// Clear value at current breakpoint
	const clearValue = useCallback(() => {
		if (!selectedLayer) return;

		dispatch({
			type: "UPDATE_LAYER_CSS",
			payload: {
				id: selectedLayer.id,
				css: { [cssProperty]: "" }, // Empty string removes the value
				breakpointId: activeBreakpointId ?? undefined,
			},
		});
	}, [selectedLayer, cssProperty, activeBreakpointId, dispatch]);

	return {
		value: valueInfo.value,
		inheritedValue: valueInfo.inheritedValue,
		isExplicit: valueInfo.isExplicit,
		fromBreakpointId: valueInfo.fromBreakpointId,
		fromBreakpointName,
		isPrimary: valueInfo.isPrimary,
		setValue,
		clearValue,
	};
};
