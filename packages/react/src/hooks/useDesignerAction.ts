import { useContext } from "react";
import { DesignerContext } from "../context/DesignerContext";

/**
 * Hook to get a function to dispatch actions to the designer state.
 * Returns the stable `dispatch` and never subscribes to state, so callers
 * don't re-render on state changes.
 */
export const useDesignerAction = () => {
	const store = useContext(DesignerContext);
	if (!store) {
		throw new Error(
			"useDesignerContext must be used within a DesignerProvider"
		);
	}
	return store.dispatch;
};
