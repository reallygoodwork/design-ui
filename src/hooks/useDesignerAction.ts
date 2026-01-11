import type { Action } from "./useDesigner";
import { useDesignerContext } from "./useDesignerContext";

/**
 * Hook to get a function to dispatch actions to the designer state.
 */
export const useDesignerAction = () => {
	const { dispatch } = useDesignerContext();
	return (action: Action) => dispatch(action);
};
