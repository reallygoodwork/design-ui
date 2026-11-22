import { useContext, useMemo } from "react";
import { DesignerContext } from "../context/DesignerContext";
import { useDesignerSelector } from "./useDesignerSelector";

const selectAll = <T>(state: T) => state;

/**
 * Hook to access the designer state and dispatch. Subscribes to the whole
 * state, so prefer `useDesignerSelector` or a slice hook where possible.
 * Throws an error if used outside of a `DesignerProvider`.
 */
export const useDesignerContext = () => {
	const store = useContext(DesignerContext);
	if (!store) {
		throw new Error(
			"useDesignerContext must be used within a DesignerProvider"
		);
	}
	const state = useDesignerSelector(selectAll);
	const { dispatch } = store;
	return useMemo(() => ({ state, dispatch }), [state, dispatch]);
};
