import { useDesignerContext } from "./useDesignerContext";

export const useHistory = () => {
	const { state } = useDesignerContext();
	return {
		canUndo: state.history.past.length > 0,
		canRedo: state.history.future.length > 0,
	};
};
