import { useCallback } from "react";
import type { CSSVars } from "../lib/Types";
import { useDesignerContext } from "./useDesignerContext";

export type FrameStyleValue = {
	/**
	 * The current value for this CSS property.
	 */
	value: string | undefined;
	/**
	 * Set the value for this frame style.
	 */
	setValue: (value: string) => void;
	/**
	 * Clear the value for this frame style.
	 */
	clearValue: () => void;
};

/**
 * Hook to get and set frame-level styles (document-level styles).
 * These are shared across all breakpoints, like body styles.
 *
 * @param cssProperty - The CSS property to manage (e.g., "--font-family")
 * @returns Object with value and setter functions
 */
export const useFrameStyle = (cssProperty: string): FrameStyleValue => {
	const { state, dispatch } = useDesignerContext();

	const value = state.frameStyles[cssProperty];

	const setValue = useCallback(
		(newValue: string) => {
			dispatch({
				type: "UPDATE_FRAME_STYLES",
				payload: {
					css: { [cssProperty]: newValue },
				},
			});
		},
		[cssProperty, dispatch]
	);

	const clearValue = useCallback(() => {
		dispatch({
			type: "UPDATE_FRAME_STYLES",
			payload: {
				css: { [cssProperty]: "" },
			},
		});
	}, [cssProperty, dispatch]);

	return {
		value,
		setValue,
		clearValue,
	};
};

/**
 * Hook to get all frame styles.
 */
export const useFrameStyles = (): CSSVars => {
	const { state } = useDesignerContext();
	return state.frameStyles;
};

/**
 * Hook to update multiple frame styles at once.
 */
export const useUpdateFrameStyles = () => {
	const { dispatch } = useDesignerContext();

	return useCallback(
		(css: Record<string, string>) => {
			dispatch({
				type: "UPDATE_FRAME_STYLES",
				payload: { css },
			});
		},
		[dispatch]
	);
};
