import { useCallback, useMemo } from "react";
import {
	getEffectiveStyles,
	getPropertyValue,
	isPrimaryBreakpoint,
} from "../lib/breakpointUtils";
import type { CSSVars } from "../lib/Types";
import { useDesignerAction } from "./useDesignerAction";
import { useDesignerContext } from "./useDesignerContext";
import { useDesignerSelector } from "./useDesignerSelector";
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
	 * Whether this breakpoint overrides a value from a smaller one.
	 */
	isOverride: boolean;
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
		isOverride: !valueInfo.isPrimary && valueInfo.isExplicit,
		setValue,
		clearValue,
	};
};

/**
 * The selected layer's styles as they apply at the active breakpoint.
 */
export const useEffectiveCss = (): CSSVars => {
	const [layer] = useSelectedLayers();
	const activeId = useDesignerSelector((state) => state.activeBreakpointId);
	const breakpoints = useDesignerSelector((state) => state.breakpoints);
	return useMemo(() => {
		if (!layer) return {};
		return activeId
			? getEffectiveStyles(layer, activeId, breakpoints)
			: { ...layer.cssVars };
	}, [layer, activeId, breakpoints]);
};

/**
 * Read and write several related properties at the active breakpoint, for
 * controls that edit them together (padding sides, width and height).
 */
export const useBreakpointCssGroup = (properties: readonly string[]) => {
	const dispatch = useDesignerAction();
	const [layer] = useSelectedLayers();
	const activeId = useDesignerSelector((state) => state.activeBreakpointId);
	const breakpoints = useDesignerSelector((state) => state.breakpoints);
	const breakpointId = activeId ?? undefined;

	const entries = properties.map((property) => {
		if (!layer || !activeId || breakpoints.length === 0) {
			const value = layer?.cssVars?.[property];
			return { value, isExplicit: value !== undefined };
		}
		const { value, isExplicit } = getPropertyValue(
			layer,
			activeId,
			property,
			breakpoints
		);
		return { value, isExplicit };
	});

	const write = (css: CSSVars) => {
		if (!layer) return;
		dispatch({
			type: "UPDATE_LAYER_CSS",
			payload: { id: layer.id, css, breakpointId },
		});
	};
	const setAll = (value: string) =>
		write(Object.fromEntries(properties.map((p) => [p, value])));

	const hasExplicit = entries.some((entry) => entry.isExplicit);
	const isPrimary =
		!activeId ||
		breakpoints.length === 0 ||
		isPrimaryBreakpoint(activeId, breakpoints);

	return {
		entries,
		hasExplicit,
		/** Showing values from a smaller breakpoint, none set here */
		isInherited: !hasExplicit && entries.some((entry) => Boolean(entry.value)),
		isPrimary,
		isOverride: !isPrimary && hasExplicit,
		setAll,
		setOne: (property: string, value: string) => write({ [property]: value }),
		write,
		clearAll: () => setAll(""),
	};
};
