import type { Actor } from "./changeLog";

/**
 * What an annotation is about. A layer, optionally one of its properties at
 * one breakpoint; a token; a change in the log; or the whole document.
 */
export type AnnotationTarget =
	| { kind: "layer"; layerId: string; property?: string; breakpointId?: string }
	| { kind: "token"; path: string }
	| { kind: "change"; entryId: string; layerId?: string }
	| { kind: "document" };

/**
 * Comments are conversation. Notes explain a change (agents leave these).
 * Decisions record why something is the way it is. Tasks ask for work, from
 * a person or an agent.
 */
export type AnnotationKind = "comment" | "note" | "decision" | "task";

export type AnnotationReply = {
	id: string;
	author: Actor;
	body: string;
	at: string;
};

export type Annotation = {
	id: string;
	kind: AnnotationKind;
	target: AnnotationTarget;
	body: string;
	author: Actor;
	at: string;
	status: "open" | "resolved";
	replies: AnnotationReply[];
	/** The change it's about, when it came from one. */
	entryId?: string;
	/** A task handed to someone, like the agent. */
	assignedTo?: Actor;
	/** Who's working on a task now. */
	claimedBy?: Actor;
};

export const ANNOTATION_KINDS: {
	kind: AnnotationKind;
	label: string;
	hint: string;
}[] = [
	{ kind: "comment", label: "Comment", hint: "Talk about it" },
	{ kind: "decision", label: "Decision", hint: "Record why it's this way" },
	{
		kind: "task",
		label: "Task",
		hint: "Ask for a change, from a person or the agent",
	},
	{ kind: "note", label: "Note", hint: "Explain a change" },
];

/** The layer an annotation sits on, if any, for pins and jumping to it. */
export const layerOf = (target: AnnotationTarget) =>
	target.kind === "layer"
		? target.layerId
		: target.kind === "change"
			? target.layerId
			: undefined;
