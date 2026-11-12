#!/usr/bin/env bun
/**
 * Lets an agent (Claude Code, Claude Desktop, any MCP client) work on a Coral
 * design: read it, pick up tasks the designer assigns, change it with a reason
 * for each change, reply, and resolve.
 *
 * Speaks MCP over stdio to the agent, and relays to the open editor over a
 * WebSocket on localhost. Start it from your MCP client, e.g.
 *   claude mcp add coral -- bun /path/to/design-ui/agent/mcp-server.ts
 * then open the editor (bun run dev → /demo/). The Activity tab shows
 * "Agent connected".
 */
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WebSocket, WebSocketServer } from "ws";
import { z } from "zod";
import {
	AGENT_PORT,
	type AgentResponse,
	type EditorEvent,
	type TaskView,
} from "../src/lib/agentProtocol";

const port = Number(process.env.CORAL_AGENT_PORT ?? AGENT_PORT);
const REQUEST_TIMEOUT = Number(process.env.CORAL_AGENT_TIMEOUT_MS ?? 15_000);
// stdout belongs to MCP; anything for people goes to stderr.
const say = (...parts: unknown[]) => console.error("[coral-agent]", ...parts);

/* ── The editor end ───────────────────────────────────────────────────── */

// Every open editor stays connected; requests go to the one in use.
// (Disconnecting older tabs made them reconnect and push each other off.)
const editors: WebSocket[] = [];
/** The editor the designer last used (focused, or assigned a task in). */
let active: WebSocket | null = null;
const current = () =>
	active?.readyState === WebSocket.OPEN
		? active
		: [...editors].reverse().find((ws) => ws.readyState === WebSocket.OPEN);
const pending = new Map<
	string,
	{
		resolve: (v: unknown) => void;
		reject: (e: Error) => void;
		timer: ReturnType<typeof setTimeout>;
		/** The editor it went to, so a disconnect can fail it at once. */
		ws: WebSocket;
	}
>();
const waiting: ((task: TaskView) => void)[] = [];

const wss = new WebSocketServer({ port, host: "127.0.0.1" });
wss.on("listening", () =>
	say(`waiting for the editor on ws://localhost:${port}`)
);
wss.on("error", (error) => say("WebSocket server error:", error.message));
wss.on("connection", (ws) => {
	editors.push(ws);
	alive.set(ws, true);
	ws.on("pong", () => alive.set(ws, true));
	say(`editor connected (${editors.length} open)`);
	ws.on("message", (data) => {
		let message: AgentResponse | EditorEvent;
		try {
			message = JSON.parse(String(data));
		} catch {
			return;
		}
		if ("event" in message) {
			if (message.event === "active" || message.event === "task_assigned")
				active = ws;
			if (message.event === "task_assigned") {
				const next = waiting.shift();
				// Only wakes a waiting call; the editor's task list is the record.
				if (next) next(message.task);
			}
			return;
		}
		const call = pending.get(message.id);
		if (!call) return;
		pending.delete(message.id);
		clearTimeout(call.timer);
		if (message.ok) call.resolve(message.result);
		else call.reject(new Error(message.error));
	});
	ws.on("close", () => {
		// Requests this editor won't answer now fail at once, not at the timeout.
		for (const [id, call] of pending) {
			if (call.ws !== ws) continue;
			pending.delete(id);
			clearTimeout(call.timer);
			call.reject(
				new Error(
					"The editor disconnected before answering. Is the tab still open?"
				)
			);
		}
		if (active === ws) active = null;
		const index = editors.indexOf(ws);
		if (index !== -1) editors.splice(index, 1);
		say("editor disconnected");
	});
});

// Drop editors that stopped answering, like a tab closed mid-handshake or a
// sleeping laptop, so requests never go to a dead socket.
const alive = new WeakMap<WebSocket, boolean>();
setInterval(() => {
	for (const ws of [...editors]) {
		if (!alive.get(ws)) {
			ws.terminate();
			continue;
		}
		alive.set(ws, false);
		ws.ping();
	}
}, 10_000).unref();

const NO_EDITOR = `No editor is connected. Open the Coral editor (bun run dev, then /demo/) and check the Activity tab says "Agent connected". Its agentUrl must be ws://localhost:${port}.`;

/** Sends one request to the editor and waits for its answer. */
const ask = (method: string, params?: unknown): Promise<unknown> =>
	new Promise((resolve, reject) => {
		const editor = current();
		if (!editor) return reject(new Error(NO_EDITOR));
		const id = randomUUID();
		const timer = setTimeout(() => {
			pending.delete(id);
			reject(
				new Error(
					`The editor didn't answer ${method} in ${REQUEST_TIMEOUT / 1000}s`
				)
			);
		}, REQUEST_TIMEOUT);
		pending.set(id, { resolve, reject, timer, ws: editor });
		editor.send(JSON.stringify({ id, method, params }));
	});

/* ── The agent end ────────────────────────────────────────────────────── */

const text = (value: unknown) => ({
	content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});
const failed = (error: unknown) => ({
	isError: true,
	content: [
		{
			type: "text" as const,
			text: error instanceof Error ? error.message : String(error),
		},
	],
});
const run = (method: string, params?: unknown) =>
	ask(method, params).then(text, failed);

const server = new McpServer(
	{ name: "coral-design", version: "0.1.0" },
	{
		instructions: [
			"Coral is a design editor. A designer leaves tasks on layers and tokens and can assign them to you.",
			"Work a task like this: list_tasks (or wait_for_task), claim_task, get_design, then apply_changes with a reason the designer will read, then resolve_task with a one-line summary.",
			"Prefer design tokens over raw values: a property set to var(--color-text-muted) follows themes and breakpoints.",
			"If the task is unclear, reply with a question instead of guessing, and leave it open.",
		].join("\n"),
	}
);

server.registerTool(
	"get_design",
	{
		title: "Read the design",
		description:
			"The whole design: layers with their --css-properties (base and per-breakpoint overrides), breakpoints, frame styles, tokens with their modes, and the rules for editing. Read it before changing anything.",
		annotations: { readOnlyHint: true },
	},
	() => run("get_design")
);

server.registerTool(
	"list_tasks",
	{
		title: "List tasks",
		description:
			"Open tasks the designer left, each with what it's about (a layer, a property, a token), the values there now, replies, and changes already made for it. `assigned` is true when it's handed to you.",
		inputSchema: {
			include_resolved: z
				.boolean()
				.optional()
				.describe("Also list resolved tasks"),
		},
		annotations: { readOnlyHint: true },
	},
	({ include_resolved }) =>
		run("list_tasks", { includeResolved: include_resolved })
);

server.registerTool(
	"wait_for_task",
	{
		title: "Wait for a task",
		description:
			"Waits until the designer assigns a task to you, then returns it. Returns at once if one is already waiting. Use it to keep working through tasks as they come in.",
		inputSchema: {
			timeout_seconds: z
				.number()
				.int()
				.min(1)
				.max(300)
				.optional()
				.describe("How long to wait; 120 by default"),
		},
		annotations: { readOnlyHint: true },
	},
	async ({ timeout_seconds = 120 }) => {
		try {
			const open = (await ask("list_tasks")) as TaskView[];
			const ready = open.find((t) => t.assigned && !t.claimedBy);
			if (ready) return text(ready);
		} catch (error) {
			return failed(error);
		}
		return new Promise((resolve) => {
			const timer = setTimeout(() => {
				const index = waiting.indexOf(take);
				if (index !== -1) waiting.splice(index, 1);
				resolve(
					text({
						task: null,
						message: `No task was assigned in ${timeout_seconds}s.`,
					})
				);
			}, timeout_seconds * 1000);
			const take = (task: TaskView) => {
				clearTimeout(timer);
				resolve(text(task));
			};
			waiting.push(take);
		});
	}
);

server.registerTool(
	"claim_task",
	{
		title: "Claim a task",
		description:
			"Tells the designer you're working on a task; it shows as in progress in their Activity tab.",
		inputSchema: { task_id: z.string() },
	},
	({ task_id }) => run("claim_task", { taskId: task_id })
);

const ACTION = z
	.object({
		type: z
			.enum([
				"UPDATE_LAYER_CSS",
				"UPDATE_LAYER_VALUE",
				"UPDATE_LAYER_NAME",
				"UPDATE_LAYER_ELEMENT_TYPE",
				"ADD_LAYER",
				"DELETE_LAYERS",
				"MOVE_LAYER",
				"UPDATE_FRAME_STYLES",
			])
			.describe("What to do"),
		payload: z
			.record(z.string(), z.unknown())
			.describe(
				"UPDATE_LAYER_CSS { id, css: { '--prop': 'value' }, breakpointId? } (empty string removes a value; breakpointId targets an override, omit for base). UPDATE_LAYER_VALUE { id, value }. UPDATE_LAYER_NAME { layerId, name }. ADD_LAYER { layer: { id, type: 'text'|'frame'|'image', name, value, cssVars }, targetLayerId, position: 'before'|'inside'|'after' }. DELETE_LAYERS { layerIds }. MOVE_LAYER { layerIds, targetId, position: 'before'|'on'|'after' }. UPDATE_FRAME_STYLES { css }."
			),
	})
	.describe("One edit");

server.registerTool(
	"apply_changes",
	{
		title: "Change the design",
		description:
			"Applies edits, all or none: if any is invalid, nothing changes and the error says which. Each change shows in the designer's history with your reason, and is linked to the task when task_id is given. The designer can undo or revert any of them.",
		inputSchema: {
			reason: z
				.string()
				.min(1)
				.describe(
					"Why, in a sentence the designer will read next to the change"
				),
			actions: z.array(ACTION).min(1),
			task_id: z.string().optional().describe("The task these changes are for"),
		},
	},
	({ reason, actions, task_id }) =>
		run("apply_changes", { reason, actions, taskId: task_id })
);

server.registerTool(
	"set_token",
	{
		title: "Add or update a token",
		description:
			"Adds a design token, or replaces the one with the same path. Values can alias another token ({color.neutral.900}) or compose them (color-mix(in oklch, {color.brand} 40%, white)). modes give values per theme, brand or breakpoint: [{ when: { theme: 'dark' }, value: '…' }].",
		inputSchema: {
			reason: z.string().min(1),
			task_id: z.string().optional(),
			token: z.object({
				path: z.string().describe("Dotted, like color.bg.page"),
				type: z.enum([
					"color",
					"dimension",
					"fontFamily",
					"fontWeight",
					"number",
					"shadow",
				]),
				tier: z.enum(["primitive", "semantic", "component"]),
				value: z.string(),
				modes: z
					.array(
						z.object({
							when: z.record(z.string(), z.string()),
							value: z.string(),
						})
					)
					.optional(),
				description: z.string().optional(),
			}),
		},
	},
	({ reason, task_id, token }) =>
		run("set_token", { reason, token, taskId: task_id })
);

server.registerTool(
	"reply",
	{
		title: "Reply on a task or comment",
		description:
			"Posts in a thread without resolving it: a question when something's unclear, or a progress update.",
		inputSchema: { annotation_id: z.string(), body: z.string().min(1) },
	},
	({ annotation_id, body }) =>
		run("reply", { annotationId: annotation_id, body })
);

server.registerTool(
	"resolve_task",
	{
		title: "Resolve a task",
		description:
			"Marks a task done, with a one-line summary of what you changed. The designer can reopen it.",
		inputSchema: { task_id: z.string(), summary: z.string().min(1) },
	},
	({ task_id, summary }) => run("resolve_task", { taskId: task_id, summary })
);

await server.connect(new StdioServerTransport());
say("MCP server ready");
