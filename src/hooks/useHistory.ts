import { useDesignerContext } from "./useDesignerContext";

export const useHistory = () => {
	const { state } = useDesignerContext();
	return {
		canUndo: state.historyIndex > 0,
		canRedo: state.historyIndex < state.history.length - 1,
	};
};
