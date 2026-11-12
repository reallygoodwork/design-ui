import type {
	Annotation,
	AnnotationKind,
	AnnotationTarget,
} from "@design-ui/core";
import { type Actor, newId, YOU } from "@design-ui/core";
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
import { useChangeLog } from "./useChangeLog";

export type NewAnnotation = {
	kind?: AnnotationKind;
	target: AnnotationTarget;
	body: string;
	author?: Actor;
	entryId?: string;
};

/** Where a new comment is being written: a target and, from the canvas, a point. */
export type Draft = { target: AnnotationTarget; at?: { x: number; y: number } };

type AnnotationsStore = {
	annotations: Annotation[];
	add: (annotation: NewAnnotation) => string;
	reply: (id: string, body: string, author?: Actor) => void;
	setStatus: (id: string, status: Annotation["status"]) => void;
	/** Hands a task to someone, like the agent, or takes it back with undefined. */
	assign: (id: string, to: Actor | undefined) => void;
	/** Marks a task as being worked on. */
	claim: (id: string, by: Actor) => void;
	remove: (id: string) => void;
	/** Clicking the canvas picks a layer to comment on. */
	commentMode: boolean;
	setCommentMode: (on: boolean) => void;
	draft: Draft | null;
	setDraft: (draft: Draft | null) => void;
	/** The thread shown open, from a pin or the feed. */
	openId: string | null;
	setOpenId: (id: string | null) => void;
};

const AnnotationsContext = createContext<AnnotationsStore | null>(null);

const now = () => new Date().toISOString();

/**
 * Comments, notes, decisions and tasks, anchored to layers, properties,
 * tokens or changes. An agent change that gives a reason becomes a note on
 * the layer it touched, so its intent shows up where the change did.
 */
export const AnnotationsProvider = ({
	initialAnnotations = [],
	onChange,
	children,
}: {
	initialAnnotations?: Annotation[];
	onChange?: (annotations: Annotation[]) => void;
	children: ReactNode;
}) => {
	const [annotations, setAnnotations] =
		useState<Annotation[]>(initialAnnotations);
	const [commentMode, setCommentMode] = useState(false);
	const [draft, setDraft] = useState<Draft | null>(null);
	const [openId, setOpenId] = useState<string | null>(null);
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const log = useChangeLog();
	const lastNote = useRef<{ reason: string; at: number } | null>(null);

	const update = useCallback((change: (all: Annotation[]) => Annotation[]) => {
		setAnnotations((prev) => {
			const next = change(prev);
			queueMicrotask(() => onChangeRef.current?.(next));
			return next;
		});
	}, []);

	const add = useCallback(
		(input: NewAnnotation) => {
			const id = newId("ann");
			update((all) => [
				...all,
				{
					id,
					kind: input.kind ?? "comment",
					target: input.target,
					body: input.body,
					author: input.author ?? YOU,
					at: now(),
					status: "open",
					replies: [],
					entryId: input.entryId,
				},
			]);
			return id;
		},
		[update]
	);

	// An agent's reason for a change becomes a note on what it changed.
	const { onEntry } = log;
	useEffect(
		() =>
			onEntry((entry) => {
				// Work on a task is reported in the task's own thread.
				if (entry.actor.kind !== "agent" || !entry.reason || entry.taskId)
					return;
				// One note for a batch of changes made for the same reason.
				const last = lastNote.current;
				if (last && last.reason === entry.reason && Date.now() - last.at < 5000)
					return;
				lastNote.current = { reason: entry.reason, at: Date.now() };
				add({
					kind: "note",
					author: entry.actor,
					body: entry.reason,
					entryId: entry.id,
					target: entry.layerIds[0]
						? { kind: "change", entryId: entry.id, layerId: entry.layerIds[0] }
						: { kind: "change", entryId: entry.id },
				});
			}),
		[onEntry, add]
	);

	const value = useMemo<AnnotationsStore>(
		() => ({
			annotations,
			add,
			reply: (id, body, author = YOU) =>
				update((all) =>
					all.map((a) =>
						a.id === id
							? {
									...a,
									replies: [
										...a.replies,
										{ id: newId("rep"), author, body, at: now() },
									],
								}
							: a
					)
				),
			setStatus: (id, status) =>
				update((all) => all.map((a) => (a.id === id ? { ...a, status } : a))),
			assign: (id, to) =>
				update((all) =>
					all.map((a) =>
						a.id === id ? { ...a, assignedTo: to, claimedBy: undefined } : a
					)
				),
			claim: (id, by) =>
				update((all) =>
					all.map((a) => (a.id === id ? { ...a, claimedBy: by } : a))
				),
			remove: (id) => update((all) => all.filter((a) => a.id !== id)),
			commentMode,
			setCommentMode,
			draft,
			setDraft,
			openId,
			setOpenId,
		}),
		[annotations, add, update, commentMode, draft, openId]
	);

	return (
		<AnnotationsContext.Provider value={value}>
			{children}
		</AnnotationsContext.Provider>
	);
};

const NONE: AnnotationsStore = {
	annotations: [],
	add: () => "",
	reply: () => {},
	setStatus: () => {},
	assign: () => {},
	claim: () => {},
	remove: () => {},
	commentMode: false,
	setCommentMode: () => {},
	draft: null,
	setDraft: () => {},
	openId: null,
	setOpenId: () => {},
};

export const useAnnotations = () => useContext(AnnotationsContext) ?? NONE;
