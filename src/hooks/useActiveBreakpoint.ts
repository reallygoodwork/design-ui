import { useMemo } from "react";
import { useDesignerContext } from "./useDesignerContext";

/**
 * Hook to get the currently active breakpoint.
 */
export const useActiveBreakpoint = () => {
	const { state } = useDesignerContext();

	const activeBreakpoint = useMemo(() => {
		if (!state.activeBreakpointId) return null;
		return (
			state.breakpoints.find((bp) => bp.id === state.activeBreakpointId) ?? null
		);
	}, [state.activeBreakpointId, state.breakpoints]);

	return activeBreakpoint;
};

/**
 * Hook to get all breakpoints.
 */
export const useBreakpoints = () => {
	const { state } = useDesignerContext();
	return state.breakpoints;
};

/**
 * Hook to get the selected breakpoint (when frame itself is selected).
 */
export const useSelectedBreakpoint = () => {
	const { state } = useDesignerContext();

	const selectedBreakpoint = useMemo(() => {
		if (!state.selectedBreakpointId) return null;
		return (
			state.breakpoints.find((bp) => bp.id === state.selectedBreakpointId) ??
			null
		);
	}, [state.selectedBreakpointId, state.breakpoints]);

	return selectedBreakpoint;
};
