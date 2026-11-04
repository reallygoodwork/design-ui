import { useCallback, useContext, useRef, useSyncExternalStore } from "react";
import { DesignerContext } from "../context/DesignerContext";
import type { State } from "./useDesigner";

/**
 * Subscribe to a slice of the designer state. The component re-renders only
 * when the selected value changes according to `isEqual` (default `Object.is`).
 * Selectors may return derived objects: pass a structural `isEqual` so equal
 * results keep their previous reference.
 */
export const useDesignerSelector = <T>(
	selector: (state: State) => T,
	isEqual: (a: T, b: T) => boolean = Object.is
): T => {
	const store = useContext(DesignerContext);
	if (!store) {
		throw new Error(
			"useDesignerContext must be used within a DesignerProvider"
		);
	}

	const cache = useRef<{
		state: State;
		selector: (state: State) => T;
		value: T;
	} | null>(null);

	const getSnapshot = useCallback(() => {
		const state = store.getState();
		const prev = cache.current;
		if (prev && prev.state === state && prev.selector === selector) {
			return prev.value;
		}
		const next = selector(state);
		const value = prev && isEqual(prev.value, next) ? prev.value : next;
		cache.current = { state, selector, value };
		return value;
	}, [store, selector, isEqual]);

	return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
};
