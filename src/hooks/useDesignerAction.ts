import { useContext } from "react";
import { DesignerDispatchContext } from "../context/DesignerContext";

/**
 * Hook to get a function to dispatch actions to the designer state.
 * Returns the stable `dispatch`, and reads only the dispatch context, so callers
 * don't re-render on state changes.
 */
export const useDesignerAction = () => {
	const dispatch = useContext(DesignerDispatchContext);
	if (!dispatch) {
		throw new Error(
			"useDesignerContext must be used within a DesignerProvider"
		);
	}
	return dispatch;
};
