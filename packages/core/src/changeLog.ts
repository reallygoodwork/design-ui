import type { Action, State } from "./reducer";
import type { Token } from "./tokens";
import type { CSSVars, LayerNode } from "./types";

/** Who made a change. */
export type Actor = { kind: "user" | "agent"; name: string };

export const YOU: Actor = { kind: "user", name: "You" };

/** Extra context a change can carry, like an agent's reason for it. */
export type ActionMeta = { actor?: Actor; reason?: string; taskId?: string };

/** One value that changed. `breakpointId` is null for base styles. */
export type ValueChange = {
	layerId?: string;
	property: string;
	breakpointId?: string | null;
	from?: string;
	to?: string;
};

export type ChangeEntry = {
	id: string;
	at: string;
	actor: Actor;
	reason?: string;
	/** The task this change was made for. */
	taskId?: string;
	kind: "layer" | "frame" | "breakpoint" | "document" | "tokens";
	summary: string;
	/** Layers it touched, for jumping to them and anchoring comments. */
	layerIds: string[];
	/** Style values before and after, so the change can be reverted. */
	changes: ValueChange[];
	/** Tokens before and after, for token edits. */
	tokens?: { before: Token[]; after: Token[] };
	/** Undo removed it; redo brings it back. */
	undone?: boolean;
	/** Whether undo and redo cover it. Token edits aren't in undo yet. */
	undoable: boolean;
	/** Edits in one run (a drag, a scrub) share a key and one entry. */
	coalesceKey?: string | null;
};

let counter = 0;
export const newId = (prefix: string) =>
	`${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`;

const name = (nodes: Record<string, LayerNode>, id: string) =>
	nodes[id]?.name ?? "A layer";

/** Values written for a layer at a breakpoint: base when it's the primary one. */
const cssAt = (
	node: LayerNode | undefined,
	breakpointId: string | null
): CSSVars =>
	(breakpointId ? node?.breakpointCssVars?.[breakpointId] : node?.cssVars) ??
	{};

/** What an edit did to one layer's styles, read from the state before and after. */
function cssChanges(
	prev: State,
	next: State,
	layerId: string,
	keys: string[]
): ValueChange[] {
	const primary =
		[...next.breakpoints].sort((a, b) => a.width - b.width)[0]?.id ?? null;
	const scopes: (string | null)[] = [
		null,
		...next.breakpoints.map((bp) => bp.id).filter((id) => id !== primary),
	];
	const out: ValueChange[] = [];
	for (const scope of scopes) {
		const before = cssAt(prev.nodes[layerId], scope);
		const after = cssAt(next.nodes[layerId], scope);
		for (const property of keys) {
			if (before[property] !== after[property]) {
				out.push({
					layerId,
					property,
					breakpointId: scope,
					from: before[property],
					to: after[property],
				});
			}
		}
	}
	return out;
}

const shortValue = (value: string | undefined) => {
	if (!value) return "unset";
	const token = value.match(/^var\(--([\w-]+)\)$/)?.[1];
	if (token) return token.replaceAll("-", ".");
	return value.length > 24 ? `${value.slice(0, 23)}…` : value;
};

const breakpointName = (state: State, id: string | null | undefined) =>
	id ? (state.breakpoints.find((bp) => bp.id === id)?.name ?? id) : null;

/** "color unset → color.text.primary at Desktop" */
export const describeValue = (state: State, change: ValueChange) => {
	const where = breakpointName(state, change.breakpointId);
	return `${change.property.replace(/^--/, "")} ${shortValue(change.from)} → ${shortValue(change.to)}${where ? ` at ${where}` : ""}`;
};

/**
 * A log entry for an edit that went into undo history, or null for actions
 * that didn't change the document (selection, zoom) or replaced it wholesale.
 */
export function describeAction(
	action: Action,
	prev: State,
	next: State,
	meta: ActionMeta = {}
): Omit<ChangeEntry, "id" | "at"> | null {
	const base = {
		actor: meta.actor ?? YOU,
		reason: meta.reason,
		taskId: meta.taskId,
		undoable: true,
	};

	switch (action.type) {
		case "UPDATE_LAYER_CSS": {
			const { id, css } = action.payload;
			const changes = cssChanges(prev, next, id, Object.keys(css));
			if (changes.length === 0) return null;
			const summary =
				changes.length === 1
					? `${name(next.nodes, id)}: ${describeValue(next, changes[0])}`
					: `${name(next.nodes, id)}: ${changes.length} values changed`;
			return { ...base, kind: "layer", summary, layerIds: [id], changes };
		}
		case "UPDATE_LAYER_VALUE":
			return {
				...base,
				kind: "layer",
				summary: `${name(next.nodes, action.payload.id)}: text edited`,
				layerIds: [action.payload.id],
				changes: [],
			};
		case "UPDATE_LAYER_NAME":
			return {
				...base,
				kind: "layer",
				summary: `Renamed ${name(prev.nodes, action.payload.layerId)} to ${action.payload.name}`,
				layerIds: [action.payload.layerId],
				changes: [],
			};
		case "UPDATE_LAYER_LOCK":
			return {
				...base,
				kind: "layer",
				summary: `${action.payload.isLocked ? "Locked" : "Unlocked"} ${name(next.nodes, action.payload.layerId)}`,
				layerIds: [action.payload.layerId],
				changes: [],
			};
		case "UPDATE_LAYER_ELEMENT_TYPE":
			return {
				...base,
				kind: "layer",
				summary: `${name(next.nodes, action.payload.layerId)} is now <${action.payload.elementType}>`,
				layerIds: [action.payload.layerId],
				changes: [],
			};
		case "ADD_LAYER": {
			const layer = action.payload.layer;
			const where =
				action.payload.position === "inside"
					? "inside"
					: action.payload.position;
			return {
				...base,
				kind: "layer",
				summary: `Added ${layer.name} ${where} ${name(next.nodes, action.payload.targetLayerId)}`,
				layerIds: [layer.id],
				changes: [],
			};
		}
		case "DELETE_LAYERS": {
			const ids = action.payload.layerIds.filter((id) => prev.nodes[id]);
			return {
				...base,
				kind: "layer",
				summary: `Deleted ${ids.map((id) => name(prev.nodes, id)).join(", ") || "layers"}`,
				layerIds: [],
				changes: [],
			};
		}
		case "MOVE_LAYER": {
			const ids = action.payload.layerIds;
			return {
				...base,
				kind: "layer",
				summary: `Moved ${ids.map((id) => name(next.nodes, id)).join(", ")} ${action.payload.position === "on" ? "into" : action.payload.position} ${name(next.nodes, action.payload.targetId)}`,
				layerIds: ids,
				changes: [],
			};
		}
		case "UPDATE_FRAME_STYLES": {
			const changes = Object.keys(action.payload.css)
				.filter(
					(property) =>
						prev.frameStyles[property] !== next.frameStyles[property]
				)
				.map((property) => ({
					property,
					from: prev.frameStyles[property],
					to: next.frameStyles[property],
				}));
			if (changes.length === 0) return null;
			return {
				...base,
				kind: "frame",
				summary: `Frame styles: ${changes.map((c) => describeValue(next, c)).join(", ")}`,
				layerIds: [],
				changes,
			};
		}
		case "ADD_BREAKPOINT":
		case "UPDATE_BREAKPOINT":
		case "DELETE_BREAKPOINT":
		case "SET_BREAKPOINTS": {
			const verb = {
				ADD_BREAKPOINT: "Added",
				UPDATE_BREAKPOINT: "Changed",
				DELETE_BREAKPOINT: "Deleted",
				SET_BREAKPOINTS: "Replaced",
			}[action.type];
			return {
				...base,
				kind: "breakpoint",
				summary: `${verb} a breakpoint`,
				layerIds: [],
				changes: [],
			};
		}
		default:
			return {
				...base,
				kind: "document",
				summary: `Edited the document (${action.type.toLowerCase()})`,
				layerIds: [],
				changes: [],
			};
	}
}

/** Whether an action went into undo history: a new step, or more of the same run. */
export const committed = (prev: State, next: State) => {
	if (next.history.past !== prev.history.past) return "new";
	const docChanged =
		next.nodes !== prev.nodes ||
		next.rootIds !== prev.rootIds ||
		next.breakpoints !== prev.breakpoints ||
		next.frameStyles !== prev.frameStyles;
	return docChanged &&
		next.lastCoalesceKey !== null &&
		next.lastCoalesceKey === prev.lastCoalesceKey
		? "coalesced"
		: null;
};

/** Merges a run's later edit into its entry: first `from`, latest `to`. */
export function mergeEntry(
	entry: ChangeEntry,
	later: Omit<ChangeEntry, "id" | "at">,
	state: State
): ChangeEntry {
	const changes = [...entry.changes];
	for (const change of later.changes) {
		const same = changes.findIndex(
			(c) =>
				c.layerId === change.layerId &&
				c.property === change.property &&
				c.breakpointId === change.breakpointId
		);
		if (same === -1) changes.push(change);
		else changes[same] = { ...changes[same], to: change.to };
	}
	const layerId = entry.layerIds[0];
	const layer = layerId ? (state.nodes[layerId]?.name ?? "A layer") : "";
	return {
		...entry,
		changes,
		summary:
			entry.kind === "layer" && changes.length === 1
				? `${layer}: ${describeValue(state, changes[0])}`
				: changes.length > 1
					? `${layer}: ${changes.length} values changed`
					: later.summary,
	};
}

/** A readable summary of a token edit. */
export function describeTokenChange(
	before: readonly Token[],
	after: readonly Token[]
): string | null {
	const was = new Map(before.map((t) => [t.path, t]));
	const now = new Map(after.map((t) => [t.path, t]));
	const added = after.filter((t) => !was.has(t.path)).map((t) => t.path);
	const removed = before.filter((t) => !now.has(t.path)).map((t) => t.path);
	const changed = after
		.filter(
			(t) =>
				was.has(t.path) && JSON.stringify(was.get(t.path)) !== JSON.stringify(t)
		)
		.map((t) => t.path);
	if (added.length === 1 && removed.length === 1)
		return `Renamed token ${removed[0]} to ${added[0]}`;
	const parts = [
		added.length && `added ${added.join(", ")}`,
		removed.length && `deleted ${removed.join(", ")}`,
		changed.length &&
			`changed ${changed.length > 3 ? `${changed.length} tokens` : changed.join(", ")}`,
	].filter(Boolean);
	if (parts.length === 0) return null;
	const text = parts.join("; ");
	return `Tokens: ${text}`;
}

/** The style writes that put a change's values back. */
export function revertWrites(entry: ChangeEntry) {
	const writes = new Map<
		string,
		{ layerId: string; breakpointId: string | null; css: CSSVars }
	>();
	for (const change of entry.changes) {
		if (!change.layerId) continue;
		const key = `${change.layerId}:${change.breakpointId ?? ""}`;
		const write = writes.get(key) ?? {
			layerId: change.layerId,
			breakpointId: change.breakpointId ?? null,
			css: {},
		};
		// An empty string removes the value, like the clear buttons do.
		write.css[change.property] = change.from ?? "";
		writes.set(key, write);
	}
	return [...writes.values()];
}
