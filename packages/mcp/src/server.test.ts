// @vitest-environment node
/**
 * The MCP server end to end: a real MCP client spawns the real server, and
 * fake editors connect over the real WebSocket, answering with the real
 * request handler over an in-memory design.
 */

import { spawnSync } from "node:child_process";
import type {
	Action,
	Annotation,
	ChangeEntry,
	Layer,
	Token,
} from "@design-ui/core";
import {
	type AgentEditor,
	type AgentRequest,
	handleAgentRequest,
} from "@design-ui/core";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { WebSocket } from "ws";

// The server runs on bun; without it (some CI images) the suite skips.
const hasBun = spawnSync("bun", ["--version"]).status === 0;

const PORT = 9000 + Math.floor(Math.random() * 900);
const TIMEOUT_MS = 800;

/* ── A fake editor: the real handler over an in-memory design ─────────── */

const task = (id: string, extra: Partial<Annotation> = {}): Annotation => ({
	id,
	kind: "task",
	target: { kind: "layer", layerId: "title", property: "--color" },
	body: `Task ${id}`,
	author: { kind: "user", name: "Sam" },
	at: new Date().toISOString(),
	status: "open",
	replies: [],
	...extra,
});

const makeDesign = () => {
	const layers: Layer[] = [
		{
			id: "page",
			type: "frame",
			name: "Page",
			value: "",
			cssVars: {},
			children: [
				{
					id: "title",
					type: "text",
					name: "Title",
					value: "Hi",
					cssVars: { "--color": "#18181b" },
				},
			],
		},
	];
	const state = {
		layers,
		tokens: [
			{
				path: "color.text.primary",
				type: "color",
				tier: "semantic",
				value: "#18181b",
			},
		] as readonly Token[],
		annotations: [
			task("t1", { assignedTo: { kind: "agent", name: "Agent" } }),
			task("t2"),
			{
				...task("c1"),
				kind: "comment" as const,
				target: { kind: "document" as const },
			},
		] as Annotation[],
		changes: [] as ChangeEntry[],
		dispatched: [] as { action: Action; reason: string; taskId?: string }[],
	};
	const find = (id: string) =>
		state.layers[0].children?.find((l) => l.id === id) ?? state.layers[0];
	const editor: AgentEditor = {
		layers: () => state.layers,
		breakpoints: () => [
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
				position: { x: 400, y: 0 },
			},
		],
		frameStyles: () => ({}),
		tokens: () => state.tokens,
		dimensions: () => ({ theme: ["light", "dark"] }),
		annotations: () => state.annotations,
		changes: () => state.changes,
		dispatch: (action, reason, taskId) => {
			state.dispatched.push({ action, reason, taskId });
			if (action.type === "UPDATE_LAYER_CSS") {
				const layer = find(action.payload.id);
				layer.cssVars = { ...layer.cssVars, ...action.payload.css };
			}
			state.changes.push({
				id: `e${state.changes.length}`,
				at: "",
				actor: { kind: "agent", name: "Agent" },
				kind: "layer",
				summary: `${action.type}`,
				layerIds: [],
				changes: [],
				undoable: true,
				taskId,
			});
		},
		setTokens: (update) => {
			state.tokens = update(state.tokens);
		},
		claim: (id) => {
			state.annotations = state.annotations.map((a) =>
				a.id === id ? { ...a, claimedBy: { kind: "agent", name: "Agent" } } : a
			);
		},
		reply: (id, body) => {
			state.annotations = state.annotations.map((a) =>
				a.id === id
					? {
							...a,
							replies: [
								...a.replies,
								{
									id: "r",
									author: { kind: "agent", name: "Agent" },
									body,
									at: "",
								},
							],
						}
					: a
			);
		},
		resolve: (id) => {
			state.annotations = state.annotations.map((a) =>
				a.id === id ? { ...a, status: "resolved", claimedBy: undefined } : a
			);
		},
	};
	return { state, editor };
};

type FakeEditor = {
	ws: WebSocket;
	state: ReturnType<typeof makeDesign>["state"];
	requests: string[];
};

const open: WebSocket[] = [];
/** Connects a fake editor. `answer: false` makes it receive but never reply. */
const connectEditor = (options: { answer?: boolean; active?: boolean } = {}) =>
	new Promise<FakeEditor>((resolve, reject) => {
		const { state, editor } = makeDesign();
		const ws = new WebSocket(`ws://127.0.0.1:${PORT}`);
		open.push(ws);
		const fake: FakeEditor = { ws, state, requests: [] };
		ws.on("message", (data) => {
			const request = JSON.parse(String(data)) as AgentRequest;
			fake.requests.push(request.method);
			if (options.answer === false) return;
			try {
				ws.send(
					JSON.stringify({
						id: request.id,
						ok: true,
						result: handleAgentRequest(request, editor),
					})
				);
			} catch (error) {
				ws.send(
					JSON.stringify({
						id: request.id,
						ok: false,
						error: (error as Error).message,
					})
				);
			}
		});
		ws.on("open", () => {
			ws.send(JSON.stringify({ event: "hello", editor: "test" }));
			if (options.active !== false)
				ws.send(JSON.stringify({ event: "active" }));
			// Let the server register it before the test asks anything.
			setTimeout(() => resolve(fake), 50);
		});
		ws.on("error", reject);
	});

const closeAll = async () => {
	for (const ws of open.splice(0)) {
		if (ws.readyState === WebSocket.OPEN) ws.close();
	}
	await new Promise((r) => setTimeout(r, 50));
};

/* ── The agent: a real MCP client over stdio ─────────────────────────── */

let client: Client;

const call = async (name: string, args: Record<string, unknown> = {}) => {
	const result = (await client.callTool({ name, arguments: args })) as {
		isError?: boolean;
		content: { type: string; text: string }[];
	};
	const text = result.content[0]?.text ?? "";
	let data: unknown = text;
	try {
		data = JSON.parse(text);
	} catch {}
	return { isError: Boolean(result.isError), text, data: data as never };
};

beforeAll(async () => {
	if (!hasBun) return;
	client = new Client({ name: "test-agent", version: "0" });
	await client.connect(
		new StdioClientTransport({
			command: "bun",
			args: ["--conditions=@design-ui/source", `${__dirname}/server.ts`],
			env: {
				...process.env,
				DESIGN_UI_AGENT_PORT: String(PORT),
				DESIGN_UI_AGENT_TIMEOUT_MS: String(TIMEOUT_MS),
			} as Record<string, string>,
			stderr: "ignore",
		})
	);
	// The WebSocket server starts alongside; give it a moment to listen.
	await new Promise((r) => setTimeout(r, 300));
}, 15_000);

afterEach(closeAll);
afterAll(async () => {
	await client?.close();
});

describe.skipIf(!hasBun)("the MCP server", () => {
	it("offers its tools and tells the agent how to work", async () => {
		const tools = (await client.listTools()).tools.map((t) => t.name);
		expect(tools.sort()).toEqual(
			[
				"allowed_changes",
				"apply_changes",
				"check_document",
				"claim_task",
				"export_html",
				"get_design",
				"get_rules",
				"list_tasks",
				"reply",
				"resolve_task",
				"set_token",
				"wait_for_task",
			].sort()
		);
		expect(client.getInstructions()).toMatch(/claim_task/);
	});

	it("says what to do when no editor is open", async () => {
		const result = await call("list_tasks");
		expect(result.isError).toBe(true);
		expect(result.text).toMatch(/No editor is connected/);
	});

	it("works a task from start to finish", async () => {
		const editor = await connectEditor();
		const tasks = (await call("list_tasks")).data as {
			id: string;
			assigned: boolean;
			context: unknown;
		}[];
		expect(tasks.map((t) => t.id)).toEqual(["t1", "t2"]);
		expect(tasks[0]).toMatchObject({
			assigned: true,
			context: { css: { "--color": "#18181b" } },
		});

		expect((await call("claim_task", { task_id: "t1" })).isError).toBe(false);
		const design = (await call("get_design")).data as {
			howToEdit: string[];
			layers: Layer[];
		};
		expect(design.howToEdit.join(" ")).toMatch(/var\(--/);

		const applied = await call("apply_changes", {
			task_id: "t1",
			reason: "Use the text token",
			actions: [
				{
					type: "UPDATE_LAYER_CSS",
					payload: {
						id: "title",
						css: { "--color": "var(--color-text-primary)" },
					},
				},
			],
		});
		expect(applied.data).toEqual({ applied: 1 });
		expect(editor.state.dispatched).toMatchObject([
			{ reason: "Use the text token", taskId: "t1" },
		]);

		await call("resolve_task", {
			task_id: "t1",
			summary: "Title uses color.text.primary",
		});
		const after = editor.state.annotations.find((a) => a.id === "t1");
		expect(after).toMatchObject({
			status: "resolved",
			replies: [{ body: "Title uses color.text.primary" }],
		});

		const listed = (await call("list_tasks", { include_resolved: true }))
			.data as { id: string; changes: string[] }[];
		expect(listed.find((t) => t.id === "t1")?.changes).toEqual([
			"UPDATE_LAYER_CSS",
		]);
	});

	it("rejects bad input before the editor sees it, and bad targets in the editor", async () => {
		const editor = await connectEditor();
		const badType = await call("apply_changes", {
			reason: "x",
			actions: [{ type: "UNDO", payload: {} }],
		});
		expect(badType.isError).toBe(true);
		expect(editor.requests).not.toContain("apply_changes");

		const badLayer = await call("apply_changes", {
			reason: "x",
			actions: [
				{
					type: "UPDATE_LAYER_CSS",
					payload: { id: "title", css: { "--color": "red" } },
				},
				{
					type: "UPDATE_LAYER_CSS",
					payload: { id: "ghost", css: { "--color": "red" } },
				},
			],
		});
		expect(badLayer).toMatchObject({
			isError: true,
			text: "Action 2: No layer with id ghost",
		});
		expect(editor.state.dispatched).toEqual([]);

		const noReason = await call("apply_changes", { reason: "", actions: [] });
		expect(noReason.isError).toBe(true);
	});

	it("adds and validates tokens", async () => {
		const editor = await connectEditor();
		const bad = await call("set_token", {
			reason: "x",
			token: {
				path: "has space",
				type: "color",
				tier: "primitive",
				value: "#fff",
			},
		});
		expect(bad).toMatchObject({ isError: true });
		const good = await call("set_token", {
			reason: "Brand tint",
			task_id: "t2",
			token: {
				path: "color.tint",
				type: "color",
				tier: "semantic",
				value: "color-mix(in oklch, {color.text.primary} 10%, white)",
			},
		});
		expect(good.data).toEqual({ token: "color.tint" });
		expect(editor.state.tokens.map((t) => t.path)).toContain("color.tint");
	});

	it("replies on comments without resolving them", async () => {
		const editor = await connectEditor();
		await call("reply", { annotation_id: "c1", body: "Thanks!" });
		expect(editor.state.annotations.find((a) => a.id === "c1")).toMatchObject({
			status: "open",
			replies: [{ body: "Thanks!" }],
		});
		expect(
			(await call("reply", { annotation_id: "nope", body: "?" })).text
		).toBe("No task nope");
	});

	it("returns a waiting task at once, or waits for one to be assigned", async () => {
		const editor = await connectEditor();
		const ready = await call("wait_for_task", { timeout_seconds: 5 });
		expect((ready.data as { id: string }).id).toBe("t1");

		await call("claim_task", { task_id: "t1" });
		const waiting = call("wait_for_task", { timeout_seconds: 5 });
		setTimeout(() => {
			editor.ws.send(
				JSON.stringify({
					event: "task_assigned",
					task: { id: "t2", request: "Task t2" },
				})
			);
		}, 200);
		expect(((await waiting).data as { id: string }).id).toBe("t2");

		const none = await call("wait_for_task", { timeout_seconds: 1 });
		expect(none.data).toMatchObject({ task: null });
	});

	it("times out when the editor doesn't answer, and fails fast when it disconnects", async () => {
		const silent = await connectEditor({ answer: false });
		const started = Date.now();
		const timedOut = await call("get_design");
		expect(timedOut.text).toMatch(/didn't answer get_design/);
		expect(Date.now() - started).toBeGreaterThanOrEqual(TIMEOUT_MS - 50);

		const pending = call("get_design");
		setTimeout(() => silent.ws.close(), 100);
		const dropped = await pending;
		expect(dropped.text).toMatch(/disconnected before answering/);
		expect(Date.now() - started).toBeLessThan(TIMEOUT_MS * 2);
	});

	it("sends requests to the editor in use, and falls back when it closes", async () => {
		const a = await connectEditor();
		const b = await connectEditor({ active: false });
		await call("list_tasks");
		expect(a.requests).toEqual(["list_tasks"]);
		expect(b.requests).toEqual([]);

		b.ws.send(JSON.stringify({ event: "active" }));
		await new Promise((r) => setTimeout(r, 50));
		await call("list_tasks");
		expect(b.requests).toEqual(["list_tasks"]);

		b.ws.close();
		await new Promise((r) => setTimeout(r, 100));
		await call("list_tasks");
		expect(a.requests).toEqual(["list_tasks", "list_tasks"]);
	});
});
