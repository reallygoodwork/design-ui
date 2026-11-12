import { useCallback, useContext } from "react";
import { DesignerContext } from "../context/DesignerContext";
import type { Annotation } from "../lib/annotations";
import type { ActionMeta, ChangeEntry } from "../lib/changeLog";
import { denormalize } from "../lib/layerTree";
import type { Breakpoint, CSSVars, Layer } from "../lib/Types";
import type { Token, TokenDimensions } from "../lib/tokens";
import { type NewAnnotation, useAnnotations } from "./useAnnotations";
import { useChangeLog } from "./useChangeLog";
import type { Action } from "./useDesigner";
import { useTokens } from "./useTokens";

/** Everything about a design, as JSON: what an agent reads, or what a link would load. */
export type DesignDocument = {
	version: 1;
	exportedAt: string;
	layers: Layer[];
	breakpoints: Breakpoint[];
	frameStyles: CSSVars;
	tokens: readonly Token[];
	tokenDimensions: TokenDimensions;
	annotations: Annotation[];
	changes: ChangeEntry[];
};

/**
 * The editor for hosts and agents: make changes that say who and why, leave
 * annotations, and read the whole design out as one JSON document.
 */
export const useDesignerApi = () => {
	const store = useContext(DesignerContext);
	const { tokens, dimensions } = useTokens();
	const { entries } = useChangeLog();
	const { annotations, add } = useAnnotations();

	const dispatch = useCallback(
		(action: Action, meta: ActionMeta = {}) =>
			store?.dispatchWithMeta(action, meta),
		[store]
	);

	const exportDocument = useCallback((): DesignDocument => {
		const state = store?.getState();
		return {
			version: 1,
			exportedAt: new Date().toISOString(),
			layers: state ? denormalize(state.nodes, state.rootIds) : [],
			breakpoints: state?.breakpoints ?? [],
			frameStyles: state?.frameStyles ?? {},
			tokens,
			tokenDimensions: dimensions,
			annotations,
			changes: entries,
		};
	}, [store, tokens, dimensions, annotations, entries]);

	return {
		dispatch,
		annotate: (annotation: NewAnnotation) => add(annotation),
		exportDocument,
	};
};
