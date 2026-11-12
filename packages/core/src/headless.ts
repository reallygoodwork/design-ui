import { AGENT, type AgentEditor } from "./agentProtocol";
import type { Annotation } from "./annotations";
import {
	type ActionMeta,
	type ChangeEntry,
	committed,
	describeAction,
	describeTokenChange,
	mergeEntry,
	newId,
} from "./changeLog";
import type { DesignDocument } from "./document";
import { BUILT_IN_LAYERS } from "./export";
import { denormalize, normalize } from "./layerTree";
import { createDesignerStore, firstRejection, initialState } from "./reducer";
import type { Token } from "./tokens";
import type { LayerDefinition } from "./types";

export type HeadlessEditor = AgentEditor & {
	/** The design as it is now, ready to save. */
	document: () => DesignDocument;
	/** Called after anything changes, e.g. to save the file. */
	onChange: (listener: () => void) => () => void;
};

const now = () => new Date().toISOString();

/**
 * An editor with no screen: the agent requests a browser editor answers,
 * over a document in memory. Changes go through the same store, so the same
 * rules apply (agents always edit as the editor role), and they're logged
 * the same way, so the designer sees them in Activity later.
 */
export const createHeadlessEditor = (
	doc: DesignDocument,
	options: { layerTypes?: LayerDefinition[] } = {}
): HeadlessEditor => {
	const store = createDesignerStore({
		...initialState,
		...normalize(doc.layers),
		layerTypes: [...BUILT_IN_LAYERS, ...(options.layerTypes ?? [])],
		breakpoints: doc.breakpoints,
		activeBreakpointId: doc.breakpoints[0]?.id ?? null,
		frameStyles: doc.frameStyles,
		rules: doc.rules,
		role: "editor",
	});
	let tokens: readonly Token[] = doc.tokens;
	let annotations: Annotation[] = doc.annotations;
	let changes: ChangeEntry[] = doc.changes;
	const listeners = new Set<() => void>();
	const changed = () => {
		for (const listener of [...listeners]) listener();
	};

	const append = (entry: Omit<ChangeEntry, "id" | "at">) => {
		const full: ChangeEntry = { ...entry, id: newId("chg"), at: now() };
		changes = [...changes, full];
		// As in the editor: an agent's reason, outside a task, becomes a note.
		if (full.actor.kind === "agent" && full.reason && !full.taskId)
			annotations = [
				...annotations,
				{
					id: newId("ann"),
					kind: "note",
					author: full.actor,
					body: full.reason,
					at: full.at,
					status: "open",
					replies: [],
					entryId: full.id,
					target: full.layerIds[0]
						? { kind: "change", entryId: full.id, layerId: full.layerIds[0] }
						: { kind: "change", entryId: full.id },
				},
			];
	};

	store.observe(({ action, prev, next, meta }) => {
		const kind = committed(prev, next);
		const entry = kind ? describeAction(action, prev, next, meta) : null;
		if (!entry) return;
		const last = changes[changes.length - 1];
		if (kind === "coalesced" && last)
			changes = [...changes.slice(0, -1), mergeEntry(last, entry, next)];
		else append(entry);
	});

	const updateAnnotation = (
		id: string,
		change: (a: Annotation) => Annotation
	) => {
		annotations = annotations.map((a) => (a.id === id ? change(a) : a));
		changed();
	};

	return {
		layers: () => denormalize(store.getState().nodes, store.getState().rootIds),
		breakpoints: () => store.getState().breakpoints,
		frameStyles: () => store.getState().frameStyles,
		tokens: () => tokens,
		dimensions: () => doc.tokenDimensions,
		annotations: () => annotations,
		changes: () => changes,
		dispatch: (action, reason, taskId) => {
			const meta: ActionMeta = { actor: AGENT, reason, taskId };
			store.dispatchWithMeta(action, meta);
			changed();
		},
		rules: () => store.getState().rules,
		checkRules: (actions) =>
			firstRejection(store.getState(), actions, "editor"),
		setTokens: (update, meta) => {
			const before = tokens;
			tokens = update(tokens);
			const summary = describeTokenChange(before, tokens);
			if (summary)
				append({
					actor: AGENT,
					reason: meta.reason,
					taskId: meta.taskId,
					kind: "tokens",
					summary,
					layerIds: [],
					changes: [],
					tokens: { before: [...before], after: [...tokens] },
					undoable: false,
				});
			changed();
		},
		claim: (id) => updateAnnotation(id, (a) => ({ ...a, claimedBy: AGENT })),
		reply: (id, body) =>
			updateAnnotation(id, (a) => ({
				...a,
				replies: [
					...a.replies,
					{ id: newId("rep"), author: AGENT, body, at: now() },
				],
			})),
		resolve: (id) =>
			updateAnnotation(id, (a) => ({ ...a, status: "resolved" })),
		document: () => {
			const state = store.getState();
			return {
				version: 1,
				exportedAt: now(),
				layers: denormalize(state.nodes, state.rootIds),
				breakpoints: state.breakpoints,
				frameStyles: state.frameStyles,
				tokens,
				tokenDimensions: doc.tokenDimensions,
				rules: state.rules,
				annotations,
				changes,
			};
		},
		onChange: (listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
};
