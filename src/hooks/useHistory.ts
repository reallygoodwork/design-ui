import { useDesignerSelector } from "./useDesignerSelector";

type HistoryFlags = { canUndo: boolean; canRedo: boolean };

const selectHistory = (state: {
	history: { past: unknown[]; future: unknown[] };
}): HistoryFlags => ({
	canUndo: state.history.past.length > 0,
	canRedo: state.history.future.length > 0,
});

const shallowEqual = (a: HistoryFlags, b: HistoryFlags) =>
	a.canUndo === b.canUndo && a.canRedo === b.canRedo;

export const useHistory = () =>
	useDesignerSelector(selectHistory, shallowEqual);
