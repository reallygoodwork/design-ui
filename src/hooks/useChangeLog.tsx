import type { Token, TokenDimensions } from "@design-ui/core";
import {
	type ActionMeta,
	type ChangeEntry,
	committed,
	describeAction,
	describeTokenChange,
	mergeEntry,
	newId,
	YOU,
} from "@design-ui/core";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { DesignerContext } from "../context/DesignerContext";

const MAX_ENTRIES = 500;

type ChangeLogStore = {
	/** Oldest first. */
	entries: ChangeEntry[];
	/** Records a token edit, which happens outside the layer store. */
	logTokens: (before: readonly Token[], after: readonly Token[]) => void;
	/** Credits the next token edit to someone else, like an agent, with a reason. */
	attributeNextTokenEdit: (meta: ActionMeta) => void;
	/** Records a change to themes or other mode sets. */
	logDimensions: (before: TokenDimensions, after: TokenDimensions) => void;
	/** Called with each new entry, e.g. to turn an agent's reason into a note. */
	onEntry: (listener: (entry: ChangeEntry) => void) => () => void;
};

const ChangeLogContext = createContext<ChangeLogStore | null>(null);

const NO_LOG: ChangeLogStore = {
	entries: [],
	logTokens: () => {},
	attributeNextTokenEdit: () => {},
	logDimensions: () => {},
	onEntry: () => () => {},
};

const describeDimensions = (
	before: TokenDimensions,
	after: TokenDimensions
) => {
	const parts: string[] = [];
	for (const [set, values] of Object.entries(after)) {
		const was = before[set];
		if (!was) parts.push(`added mode set ${set}`);
		else {
			const added = values.filter((v) => !was.includes(v));
			const removed = was.filter((v) => !values.includes(v));
			if (added.length === 1 && removed.length === 1)
				parts.push(`renamed ${set} ${removed[0]} to ${added[0]}`);
			else {
				if (added.length) parts.push(`added ${set} ${added.join(", ")}`);
				if (removed.length) parts.push(`removed ${set} ${removed.join(", ")}`);
			}
		}
	}
	for (const set of Object.keys(before))
		if (!(set in after)) parts.push(`removed mode set ${set}`);
	return parts.length ? `Modes: ${parts.join("; ")}` : null;
};

/**
 * Keeps a readable history of every change: who made it, why, and the values
 * before and after. It follows undo and redo, marking entries undone and
 * back, and records token and theme edits too.
 */
export const ChangeLogProvider = ({
	initialEntries = [],
	onChange,
	children,
}: {
	initialEntries?: ChangeEntry[];
	onChange?: (entries: ChangeEntry[]) => void;
	children: ReactNode;
}) => {
	const store = useContext(DesignerContext);
	const [entries, setEntries] = useState<ChangeEntry[]>(initialEntries);
	const undoStack = useRef<string[]>([]);
	const redoStack = useRef<string[]>([]);
	const listeners = useRef(new Set<(entry: ChangeEntry) => void>());
	const nextTokenMeta = useRef<ActionMeta | null>(null);
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

	const update = useCallback(
		(change: (entries: ChangeEntry[]) => ChangeEntry[]) => {
			setEntries((prev) => {
				const next = change(prev).slice(-MAX_ENTRIES);
				queueMicrotask(() => onChangeRef.current?.(next));
				return next;
			});
		},
		[]
	);

	const append = useCallback(
		(entry: Omit<ChangeEntry, "id" | "at">) => {
			const full: ChangeEntry = {
				...entry,
				id: newId("chg"),
				at: new Date().toISOString(),
			};
			update((prev) => [...prev, full]);
			for (const listener of [...listeners.current]) listener(full);
			return full;
		},
		[update]
	);

	useEffect(() => {
		if (!store) return;
		return store.observe(({ action, prev, next, meta }) => {
			if (action.type === "UNDO") {
				const id = undoStack.current.pop();
				if (!id) return;
				redoStack.current.push(id);
				update((all) =>
					all.map((e) => (e.id === id ? { ...e, undone: true } : e))
				);
				return;
			}
			if (action.type === "REDO") {
				const id = redoStack.current.pop();
				if (!id) return;
				undoStack.current.push(id);
				update((all) =>
					all.map((e) => (e.id === id ? { ...e, undone: false } : e))
				);
				return;
			}
			const kind = committed(prev, next);
			if (!kind) return;
			const described = describeAction(action, prev, next, meta);
			if (!described) return;
			const coalesceKey = next.lastCoalesceKey;

			if (kind === "coalesced") {
				update((all) => {
					const last = all.at(-1);
					if (
						last &&
						last.coalesceKey === coalesceKey &&
						last.actor.name === described.actor.name
					) {
						return [...all.slice(0, -1), mergeEntry(last, described, next)];
					}
					return all;
				});
				return;
			}
			const entry = append({ ...described, coalesceKey });
			undoStack.current.push(entry.id);
			redoStack.current = [];
		});
	}, [store, append, update]);

	const value = useMemo<ChangeLogStore>(
		() => ({
			entries,
			logTokens: (before, after) => {
				const summary = describeTokenChange(before, after);
				const meta = nextTokenMeta.current;
				nextTokenMeta.current = null;
				if (!summary) return;
				append({
					actor: meta?.actor ?? YOU,
					reason: meta?.reason,
					taskId: meta?.taskId,
					kind: "tokens",
					summary,
					layerIds: [],
					changes: [],
					tokens: { before: [...before], after: [...after] },
					undoable: false,
				});
			},
			attributeNextTokenEdit: (meta) => {
				nextTokenMeta.current = meta;
			},
			logDimensions: (before, after) => {
				const summary = describeDimensions(before, after);
				if (!summary) return;
				append({
					actor: YOU,
					kind: "tokens",
					summary,
					layerIds: [],
					changes: [],
					undoable: false,
				});
			},
			onEntry: (listener) => {
				listeners.current.add(listener);
				return () => {
					listeners.current.delete(listener);
				};
			},
		}),
		[entries, append]
	);

	return (
		<ChangeLogContext.Provider value={value}>
			{children}
		</ChangeLogContext.Provider>
	);
};

export const useChangeLog = () => useContext(ChangeLogContext) ?? NO_LOG;
