/**
 * How an agent talks to the editor: JSON requests with an id, answered with
 * a result or an error, plus events the editor pushes (a task was assigned).
 * Transport-agnostic: the MCP server relays these over a WebSocket.
 */
import type { Action } from "../hooks/useDesigner";
import type {
	Annotation,
	AnnotationKind,
	AnnotationTarget,
} from "./annotations";
import type { ChangeEntry } from "./changeLog";
import type { Breakpoint, CSSVars, Layer } from "./Types";
import type { Token, TokenDimensions } from "./tokens";

export const AGENT_PORT = 8790;

export type AgentRequest =
	| { id: string; method: "get_design" }
	| { id: string; method: "list_tasks"; params?: { includeResolved?: boolean } }
	| { id: string; method: "claim_task"; params: { taskId: string } }
	| {
			id: string;
			method: "apply_changes";
			params: { actions: unknown[]; reason: string; taskId?: string };
	  }
	| {
			id: string;
			method: "set_token";
			params: { token: unknown; reason: string; taskId?: string };
	  }
	| {
			id: string;
			method: "reply";
			params: { annotationId: string; body: string };
	  }
	| {
			id: string;
			method: "resolve_task";
			params: { taskId: string; summary: string };
	  };

export type AgentResponse =
	| { id: string; ok: true; result: unknown }
	| { id: string; ok: false; error: string };

/** Pushed by the editor, unasked. */
/** Pushed by the editor, unasked. `active` marks the editor the designer is using. */
export type EditorEvent =
	| { event: "task_assigned"; task: TaskView }
	| { event: "hello"; editor: string }
	| { event: "active" };

/** A task as an agent sees it: what to do, where, and what's there now. */
export type TaskView = {
	id: string;
	kind: AnnotationKind;
	status: Annotation["status"];
	request: string;
	from: string;
	assigned: boolean;
	claimedBy?: string;
	target: string;
	/** Current values the task is about, so the agent can start without a lookup. */
	context: Record<string, unknown>;
	replies: { from: string; body: string }[];
	changes: string[];
};

/** What the agent can do to the editor; implemented by the live editor and by tests. */
export type AgentEditor = {
	layers: () => Layer[];
	breakpoints: () => Breakpoint[];
	frameStyles: () => CSSVars;
	tokens: () => readonly Token[];
	dimensions: () => TokenDimensions;
	annotations: () => Annotation[];
	changes: () => ChangeEntry[];
	dispatch: (action: Action, reason: string, taskId?: string) => void;
	/** Changes tokens on the agent's behalf; the log credits the agent with `reason`. */
	setTokens: (
		update: (tokens: readonly Token[]) => readonly Token[],
		meta: { reason: string; taskId?: string }
	) => void;
	claim: (taskId: string) => void;
	reply: (annotationId: string, body: string) => void;
	resolve: (taskId: string) => void;
};

export const AGENT = { kind: "agent", name: "Agent" } as const;

/** Edits an agent may make. Selection, zoom and history stay with the person. */
const ALLOWED = new Set([
	"UPDATE_LAYER_CSS",
	"UPDATE_LAYER_VALUE",
	"UPDATE_LAYER_NAME",
	"UPDATE_LAYER_ELEMENT_TYPE",
	"ADD_LAYER",
	"DELETE_LAYERS",
	"MOVE_LAYER",
	"UPDATE_FRAME_STYLES",
]);

const flatten = (layers: Layer[]): Layer[] =>
	layers.flatMap((l) => [l, ...flatten(l.children ?? [])]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const stringValues = (value: unknown) =>
	isRecord(value) &&
	Object.entries(value).every(
		([k, v]) => k.startsWith("--") && typeof v === "string"
	);

type PayloadCheck = (
	p: Record<string, unknown>,
	ctx: {
		ids: Set<string>;
		breakpoints: Breakpoint[];
		/** Null when `id` names an existing layer, otherwise why not. */
		layer: (id: unknown) => string | null;
	}
) => string | null;

const CSS_PROBLEM = "css must map --custom-properties to strings";

/** Every listed layer exists, or the first problem. */
const layersProblem: PayloadCheck = (p, { layer }) => {
	if (!Array.isArray(p.layerIds) || p.layerIds.length === 0)
		return "layerIds must list layers";
	for (const id of p.layerIds) {
		const problem = layer(id);
		if (problem) return problem;
	}
	return null;
};

/** What each action's payload must hold, by action type. */
const PAYLOAD_CHECKS: Record<string, PayloadCheck> = {
	UPDATE_LAYER_CSS: (p, { breakpoints, layer }) => {
		if (!stringValues(p.css)) return CSS_PROBLEM;
		if (
			p.breakpointId !== undefined &&
			!breakpoints.some((bp) => bp.id === p.breakpointId)
		) {
			return `No breakpoint ${String(p.breakpointId)}; use one of ${breakpoints.map((bp) => bp.id).join(", ")}`;
		}
		return layer(p.id);
	},
	UPDATE_LAYER_VALUE: (p, { layer }) =>
		typeof p.value === "string" ? layer(p.id) : "value must be a string",
	UPDATE_LAYER_NAME: (p, { layer }) =>
		typeof p.name === "string" ? layer(p.layerId) : "name must be a string",
	UPDATE_LAYER_ELEMENT_TYPE: (p, { layer }) =>
		typeof p.elementType === "string"
			? layer(p.layerId)
			: "elementType must be a string",
	ADD_LAYER: (p, { ids, layer }) => {
		const l = p.layer;
		if (
			!isRecord(l) ||
			typeof l.id !== "string" ||
			typeof l.type !== "string" ||
			typeof l.name !== "string"
		) {
			return "layer needs id, type and name";
		}
		if (ids.has(l.id)) return `A layer with id ${l.id} already exists`;
		if (!["before", "inside", "after"].includes(String(p.position)))
			return "position is before, inside or after";
		return layer(p.targetLayerId);
	},
	DELETE_LAYERS: layersProblem,
	MOVE_LAYER: (p, ctx) => layersProblem(p, ctx) ?? ctx.layer(p.targetId),
	UPDATE_FRAME_STYLES: (p) => (stringValues(p.css) ? null : CSS_PROBLEM),
};

/** Why an agent's action can't be applied, or null when it can. */
export function actionProblem(
	action: unknown,
	layers: Layer[],
	breakpoints: Breakpoint[]
): string | null {
	if (!isRecord(action) || typeof action.type !== "string")
		return "Each action needs a type";
	if (!ALLOWED.has(action.type))
		return `${action.type} isn't something an agent can do`;
	const p = action.payload;
	if (!isRecord(p)) return `${action.type} needs a payload`;
	const ids = new Set(flatten(layers).map((l) => l.id));
	const layer = (id: unknown) =>
		typeof id === "string" && ids.has(id)
			? null
			: `No layer with id ${String(id)}`;
	return PAYLOAD_CHECKS[action.type]?.(p, { ids, breakpoints, layer }) ?? null;
}

const TOKEN_TYPES = new Set([
	"color",
	"dimension",
	"fontFamily",
	"fontWeight",
	"number",
	"shadow",
]);
const TIERS = new Set(["primitive", "semantic", "component"]);

/** Why a token from an agent isn't valid, or null. */
export function tokenProblem(token: unknown): string | null {
	if (!isRecord(token)) return "token must be an object";
	if (
		typeof token.path !== "string" ||
		!/^[a-z0-9][\w-]*(\.[\w-]+)*$/i.test(token.path)
	)
		return "path like color.bg.page";
	if (!TOKEN_TYPES.has(String(token.type)))
		return `type is one of ${[...TOKEN_TYPES].join(", ")}`;
	if (!TIERS.has(String(token.tier)))
		return "tier is primitive, semantic or component";
	if (typeof token.value !== "string") return "value must be a string";
	if (token.modes !== undefined) {
		if (!Array.isArray(token.modes)) return "modes must be a list";
		for (const m of token.modes) {
			if (!isRecord(m) || !isRecord(m.when) || typeof m.value !== "string")
				return "each mode is { when: {...}, value }";
		}
	}
	return null;
}

/** Describes where a task points, with what's there now. */
function describeTarget(a: Annotation, editor: AgentEditor) {
	const all = flatten(editor.layers());
	const t: AnnotationTarget = a.target;
	if (t.kind === "token") {
		const token = editor.tokens().find((x) => x.path === t.path);
		return {
			target: `token ${t.path}`,
			context: { token: token ?? "deleted" },
		};
	}
	const layerId =
		t.kind === "layer" || t.kind === "change" ? t.layerId : undefined;
	if (layerId) {
		const layer = all.find((l) => l.id === layerId);
		const property = t.kind === "layer" ? t.property : undefined;
		if (!layer) return { target: `layer ${layerId} (deleted)`, context: {} };
		return {
			target: `layer "${layer.name}" (id ${layer.id})${property ? `, property ${property}` : ""}`,
			context: {
				layer: {
					id: layer.id,
					name: layer.name,
					type: layer.type,
					value: layer.value || undefined,
				},
				css: property
					? { [property]: layer.cssVars?.[property] }
					: layer.cssVars,
				breakpointCss: property
					? Object.fromEntries(
							Object.entries(layer.breakpointCssVars ?? {})
								.filter(([, vars]) => vars[property] !== undefined)
								.map(([bp, vars]) => [bp, { [property]: vars[property] }])
						)
					: layer.breakpointCssVars,
			},
		};
	}
	return { target: "the whole document", context: {} };
}

export function taskView(a: Annotation, editor: AgentEditor): TaskView {
	const { target, context } = describeTarget(a, editor);
	return {
		id: a.id,
		kind: a.kind,
		status: a.status,
		request: a.body,
		from: a.author.name,
		assigned: Boolean(a.assignedTo),
		claimedBy: a.claimedBy?.name,
		target,
		context,
		replies: a.replies.map((r) => ({ from: r.author.name, body: r.body })),
		changes: editor
			.changes()
			.filter((c) => c.taskId === a.id)
			.map((c) => c.summary),
	};
}

/** The design, compact enough for a prompt, with the rules for editing it. */
export function designView(editor: AgentEditor) {
	return {
		howToEdit: [
			"Layer styles live in cssVars as --custom-properties: --color, --background-color, --font-size, --padding-block-start, --row-gap, --width…",
			"Base styles apply to the smallest breakpoint and up; breakpointCssVars hold overrides for larger ones.",
			"Prefer tokens: set a property to var(--token-name), where the name is the token path with dots as dashes (color.bg.page → var(--color-bg-page)).",
			"Use apply_changes with UPDATE_LAYER_CSS { id, css, breakpointId? }, UPDATE_LAYER_VALUE { id, value }, ADD_LAYER, DELETE_LAYERS, MOVE_LAYER.",
		],
		breakpoints: editor
			.breakpoints()
			.map(({ id, name, width }) => ({ id, name, width })),
		frameStyles: editor.frameStyles(),
		layers: editor.layers(),
		tokenModes: editor.dimensions(),
		tokens: editor.tokens(),
	};
}

const isTask = (a: Annotation) => a.kind === "task";

/** Answers one request from an agent. Throws with a readable message on bad input. */
export function handleAgentRequest(
	request: AgentRequest,
	editor: AgentEditor
): unknown {
	const task = (id: string) => {
		const found = editor.annotations().find((a) => a.id === id);
		if (!found) throw new Error(`No task ${id}`);
		return found;
	};
	switch (request.method) {
		case "get_design":
			return designView(editor);
		case "list_tasks":
			return editor
				.annotations()
				.filter(
					(a) =>
						isTask(a) &&
						(request.params?.includeResolved || a.status === "open")
				)
				.map((a) => taskView(a, editor));
		case "claim_task": {
			const t = task(request.params.taskId);
			if (t.status === "resolved")
				throw new Error("That task is already resolved");
			editor.claim(t.id);
			return taskView({ ...t, claimedBy: AGENT }, editor);
		}
		case "apply_changes": {
			const { actions, reason, taskId } = request.params;
			if (!reason?.trim())
				throw new Error(
					"Say why: reason is shown to the designer next to the change"
				);
			if (!Array.isArray(actions) || actions.length === 0)
				throw new Error("actions must list at least one action");
			if (taskId) task(taskId);
			// Check everything first, so a bad action applies nothing.
			let layers = editor.layers();
			const breakpoints = editor.breakpoints();
			actions.forEach((action, index) => {
				const problem = actionProblem(action, layers, breakpoints);
				if (problem) throw new Error(`Action ${index + 1}: ${problem}`);
				if ((action as Action).type === "ADD_LAYER") {
					const added = (action as Extract<Action, { type: "ADD_LAYER" }>)
						.payload.layer;
					layers = [...layers, added];
				}
			});
			for (const action of actions)
				editor.dispatch(action as Action, reason, taskId);
			return { applied: actions.length };
		}
		case "set_token": {
			const { token, reason, taskId } = request.params;
			const problem = tokenProblem(token);
			if (problem) throw new Error(problem);
			if (!reason?.trim())
				throw new Error("Say why: reason is shown to the designer");
			if (taskId) task(taskId);
			const next = token as Token;
			editor.setTokens(
				(all) =>
					all.some((t) => t.path === next.path)
						? all.map((t) => (t.path === next.path ? next : t))
						: [...all, next],
				{ reason, taskId }
			);
			return { token: next.path };
		}
		case "reply":
			task(request.params.annotationId);
			editor.reply(request.params.annotationId, request.params.body);
			return { ok: true };
		case "resolve_task": {
			const t = task(request.params.taskId);
			if (request.params.summary?.trim())
				editor.reply(t.id, request.params.summary.trim());
			editor.resolve(t.id);
			return { resolved: t.id };
		}
		default:
			throw new Error(
				`Unknown method ${(request as { method: string }).method}`
			);
	}
}
