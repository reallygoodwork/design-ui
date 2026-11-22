import { describe, expect, it } from "vitest";
import {
	type AgentEditor,
	type AgentRequest,
	actionProblem,
	handleAgentRequest,
	tokenProblem,
} from "./agentProtocol";
import type { Annotation } from "./annotations";
import type { ChangeEntry } from "./changeLog";
import type { Action } from "./reducer";
import type { Token } from "./tokens";
import type { Breakpoint, Layer } from "./types";

const layers: Layer[] = [
	{
		id: "page",
		type: "frame",
		name: "Page",
		value: "",
		children: [
			{
				id: "feature",
				type: "frame",
				name: "Feature",
				value: "",
				cssVars: { "--height": "220px" },
				breakpointCssVars: { desktop: { "--height": "360px" } },
			},
		],
	},
];
const breakpoints: Breakpoint[] = [
	{
		id: "mobile",
		name: "Mobile",
		width: 375,
		height: 667,
		position: { x: 0, y: 0 },
	},
	{
		id: "desktop",
		name: "Desktop",
		width: 1440,
		height: 900,
		position: { x: 500, y: 0 },
	},
];

const fakeEditor = () => {
	const log: {
		dispatched: { action: Action; reason: string; taskId?: string }[];
		replies: string[];
	} = {
		dispatched: [],
		replies: [],
	};
	let tokens: readonly Token[] = [
		{ path: "brand", type: "color", tier: "primitive", value: "#f00" },
	];
	let annotations: Annotation[] = [
		{
			id: "t1",
			kind: "task",
			target: { kind: "layer", layerId: "feature", property: "--height" },
			body: "Make it 16:9",
			author: { kind: "user", name: "Sam" },
			at: "",
			status: "open",
			replies: [],
			assignedTo: { kind: "agent", name: "Agent" },
		},
		{
			id: "c1",
			kind: "comment",
			target: { kind: "document" },
			body: "Nice",
			author: { kind: "user", name: "Sam" },
			at: "",
			status: "open",
			replies: [],
		},
	];
	const changes: ChangeEntry[] = [];
	const editor: AgentEditor = {
		layers: () => layers,
		breakpoints: () => breakpoints,
		frameStyles: () => ({}),
		tokens: () => tokens,
		dimensions: () => ({ theme: ["light", "dark"] }),
		annotations: () => annotations,
		changes: () => changes,
		dispatch: (action, reason, taskId) => {
			log.dispatched.push({ action, reason, taskId });
			changes.push({
				id: `e${changes.length}`,
				at: "",
				actor: { kind: "agent", name: "Agent" },
				kind: "layer",
				summary: `did ${action.type}`,
				layerIds: [],
				changes: [],
				undoable: true,
				taskId,
			});
		},
		setTokens: (update) => {
			tokens = update(tokens);
		},
		claim: (id) => {
			annotations = annotations.map((a) =>
				a.id === id ? { ...a, claimedBy: { kind: "agent", name: "Agent" } } : a
			);
		},
		reply: (_id, body) => log.replies.push(body),
		resolve: (id) => {
			annotations = annotations.map((a) =>
				a.id === id ? { ...a, status: "resolved" } : a
			);
		},
	};
	return { editor, log, tokens: () => tokens, annotations: () => annotations };
};

// Omit per member, so each method keeps its own params.
type Request = AgentRequest extends infer R
	? R extends unknown
		? Omit<R, "id">
		: never
	: never;

const ask = (editor: AgentEditor, request: Request) =>
	handleAgentRequest({ id: "1", ...request } as AgentRequest, editor);

describe("agent requests", () => {
	it("lists open tasks with what they point at and the values there now", () => {
		const { editor } = fakeEditor();
		expect(ask(editor, { method: "list_tasks" })).toEqual([
			{
				id: "t1",
				kind: "task",
				status: "open",
				request: "Make it 16:9",
				from: "Sam",
				assigned: true,
				claimedBy: undefined,
				target: 'layer "Feature" (id feature), property --height',
				context: {
					layer: {
						id: "feature",
						name: "Feature",
						type: "frame",
						value: undefined,
					},
					css: { "--height": "220px" },
					breakpointCss: { desktop: { "--height": "360px" } },
				},
				replies: [],
				changes: [],
			},
		]);
	});

	it("applies nothing when the rules block an action, and says which rule", () => {
		const { editor, log } = fakeEditor();
		editor.checkRules = (actions) =>
			actions.length === 2
				? {
						index: 1,
						ruleId: "no-size",
						message: "Feature's height can't be changed",
					}
				: null;
		expect(() =>
			ask(editor, {
				method: "apply_changes",
				params: {
					reason: "Taller",
					actions: [
						{
							type: "UPDATE_LAYER_VALUE",
							payload: { id: "feature", value: "x" },
						},
						{
							type: "UPDATE_LAYER_CSS",
							payload: { id: "feature", css: { "--height": "400px" } },
						},
					],
				},
			})
		).toThrow(
			"Action 2 breaks the rule \"no-size\": Feature's height can't be changed"
		);
		expect(log.dispatched).toEqual([]);
	});

	it("claims, changes, and resolves a task, linking the changes to it", () => {
		const { editor, log, annotations } = fakeEditor();
		ask(editor, { method: "claim_task", params: { taskId: "t1" } });
		expect(annotations()[0].claimedBy?.kind).toBe("agent");

		const result = ask(editor, {
			method: "apply_changes",
			params: {
				taskId: "t1",
				reason: "16:9 at every width",
				actions: [
					{
						type: "UPDATE_LAYER_CSS",
						payload: {
							id: "feature",
							css: { "--height": "auto" },
							breakpointId: "mobile",
						},
					},
					{
						type: "UPDATE_LAYER_CSS",
						payload: {
							id: "feature",
							css: { "--height": "" },
							breakpointId: "desktop",
						},
					},
				],
			},
		});
		expect(result).toEqual({ applied: 2 });
		expect(log.dispatched.map((d) => d.taskId)).toEqual(["t1", "t1"]);
		expect(log.dispatched[0].reason).toBe("16:9 at every width");

		ask(editor, {
			method: "resolve_task",
			params: { taskId: "t1", summary: "Done: aspect-ratio instead of height" },
		});
		expect(annotations()[0].status).toBe("resolved");
		expect(log.replies).toEqual(["Done: aspect-ratio instead of height"]);
	});

	it("applies nothing when any action is invalid", () => {
		const { editor, log } = fakeEditor();
		expect(() =>
			ask(editor, {
				method: "apply_changes",
				params: {
					reason: "x",
					actions: [
						{
							type: "UPDATE_LAYER_CSS",
							payload: { id: "feature", css: { "--height": "1px" } },
						},
						{
							type: "UPDATE_LAYER_CSS",
							payload: { id: "nope", css: { "--height": "1px" } },
						},
					],
				},
			})
		).toThrow("Action 2: No layer with id nope");
		expect(log.dispatched).toEqual([]);
	});

	it("requires a reason", () => {
		const { editor } = fakeEditor();
		expect(() =>
			ask(editor, {
				method: "apply_changes",
				params: {
					reason: " ",
					actions: [
						{
							type: "UPDATE_LAYER_VALUE",
							payload: { id: "feature", value: "x" },
						},
					],
				},
			})
		).toThrow(/Say why/);
	});

	it("adds or replaces a token", () => {
		const { editor, tokens } = fakeEditor();
		ask(editor, {
			method: "set_token",
			params: {
				reason: "r",
				token: {
					path: "brand",
					type: "color",
					tier: "primitive",
					value: "#0f0",
				},
			},
		});
		ask(editor, {
			method: "set_token",
			params: {
				reason: "r",
				token: {
					path: "ratio.wide",
					type: "number",
					tier: "primitive",
					value: "16 / 9",
				},
			},
		});
		expect(tokens().map((t) => `${t.path}=${t.value}`)).toEqual([
			"brand=#0f0",
			"ratio.wide=16 / 9",
		]);
	});

	it("returns the design with how to edit it", () => {
		const { editor } = fakeEditor();
		const design = ask(editor, { method: "get_design" }) as {
			howToEdit: string[];
			layers: Layer[];
		};
		expect(design.layers).toBe(layers);
		expect(design.howToEdit.join(" ")).toContain("var(--color-bg-page)");
	});
});

describe("validation", () => {
	it("keeps agents to editing actions with real targets", () => {
		expect(actionProblem({ type: "UNDO" }, layers, breakpoints)).toBe(
			"UNDO isn't something an agent can do"
		);
		expect(
			actionProblem({ type: "SELECT_LAYER", payload: {} }, layers, breakpoints)
		).toMatch(/isn't something/);
		expect(
			actionProblem(
				{
					type: "UPDATE_LAYER_CSS",
					payload: { id: "feature", css: { color: "red" } },
				},
				layers,
				breakpoints
			)
		).toMatch(/--custom-properties/);
		expect(
			actionProblem(
				{
					type: "UPDATE_LAYER_CSS",
					payload: { id: "feature", css: {}, breakpointId: "watch" },
				},
				layers,
				breakpoints
			)
		).toMatch(/No breakpoint watch/);
		expect(
			actionProblem(
				{
					type: "ADD_LAYER",
					payload: {
						layer: { id: "feature", type: "text", name: "x" },
						targetLayerId: "page",
						position: "inside",
					},
				},
				layers,
				breakpoints
			)
		).toMatch(/already exists/);
		expect(
			actionProblem(
				{
					type: "ADD_LAYER",
					payload: {
						layer: { id: "new", type: "text", name: "x" },
						targetLayerId: "page",
						position: "inside",
					},
				},
				layers,
				breakpoints
			)
		).toBeNull();
	});

	it("checks token shape", () => {
		expect(
			tokenProblem({
				path: "a.b",
				type: "color",
				tier: "primitive",
				value: "#fff",
			})
		).toBeNull();
		expect(
			tokenProblem({
				path: "a b",
				type: "color",
				tier: "primitive",
				value: "#fff",
			})
		).toMatch(/path/);
		expect(
			tokenProblem({
				path: "a",
				type: "colour",
				tier: "primitive",
				value: "#fff",
			})
		).toMatch(/type/);
	});
});
