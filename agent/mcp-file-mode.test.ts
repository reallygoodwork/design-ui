// @vitest-environment node
/**
 * The MCP server working on a design file: a real MCP client spawns the real
 * server with a file and no browser, works a task within the rules, and the
 * file holds the result. Then an editor connects and gets the design.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DesignDocument } from "@design-ui/core";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WebSocket } from "ws";

const hasBun = spawnSync("bun", ["--version"]).status === 0;
const PORT = 9900 + Math.floor(Math.random() * 90);

const design: DesignDocument = {
	version: 1,
	layers: [
		{
			id: "page",
			name: "Page",
			type: "frame",
			value: "",
			children: [
				{
					id: "title",
					name: "Title",
					type: "text",
					value: "Hello",
					cssVars: { "--font-size": "24px" },
				},
			],
		},
	],
	breakpoints: [
		{
			id: "mobile",
			name: "Mobile",
			width: 375,
			height: 667,
			position: { x: 0, y: 0 },
		},
	],
	frameStyles: {},
	tokens: [],
	tokenDimensions: {},
	rules: [
		{
			id: "title-color-only",
			target: { layerIds: ["title"] },
			editableProperties: ["--color"],
		},
	],
	annotations: [
		{
			id: "t1",
			kind: "task",
			target: { kind: "layer", layerId: "title" },
			body: "Make the title red",
			author: { kind: "user", name: "Sam" },
			at: "2026-01-01T00:00:00.000Z",
			status: "open",
			replies: [],
			assignedTo: { kind: "agent", name: "Agent" },
		},
	],
	changes: [],
};

const file = join(mkdtempSync(join(tmpdir(), "design-")), "design.json");
const saved = () => JSON.parse(readFileSync(file, "utf8")) as DesignDocument;

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
	writeFileSync(file, JSON.stringify(design));
	client = new Client({ name: "test-agent", version: "0" });
	await client.connect(
		new StdioClientTransport({
			command: "bun",
			args: [`${__dirname}/mcp-server.ts`, file],
			env: { ...process.env, CORAL_AGENT_PORT: String(PORT) } as Record<
				string,
				string
			>,
			stderr: "ignore",
		})
	);
});

afterAll(async () => {
	await client?.close();
});

describe.skipIf(!hasBun)("the MCP server on a design file", () => {
	it("works a task with no browser open, within the rules, and saves it", async () => {
		const tasks = await call("list_tasks");
		expect(tasks.data).toMatchObject([{ id: "t1", assigned: true }]);

		expect((await call("claim_task", { task_id: "t1" })).isError).toBe(false);

		const limits = await call("allowed_changes", { layer_id: "title" });
		expect(limits.data).toMatchObject({ editableProperties: ["--color"] });

		const allowed = await call("apply_changes", {
			task_id: "t1",
			reason: "Red, as asked",
			actions: [
				{
					type: "UPDATE_LAYER_CSS",
					payload: { id: "title", css: { "--color": "red" } },
				},
			],
		});
		expect(allowed.isError).toBe(false);

		const blocked = await call("apply_changes", {
			task_id: "t1",
			reason: "Bigger too",
			actions: [
				{
					type: "UPDATE_LAYER_CSS",
					payload: { id: "title", css: { "--font-size": "40px" } },
				},
			],
		});
		expect(blocked.isError).toBe(true);
		expect(blocked.text).toContain('breaks the rule "title-color-only"');

		await call("resolve_task", { task_id: "t1", summary: "Done" });

		const doc = saved();
		expect(doc.layers[0].children?.[0].cssVars).toEqual({
			"--font-size": "24px",
			"--color": "red",
		});
		expect(doc.changes).toHaveLength(1);
		expect(doc.changes[0]).toMatchObject({
			actor: { kind: "agent" },
			reason: "Red, as asked",
			taskId: "t1",
		});
		expect(doc.annotations[0]).toMatchObject({
			status: "resolved",
			claimedBy: { kind: "agent" },
		});
		expect((await call("check_document")).data).toEqual({ violations: [] });
	});

	it("shows the file's design to an editor that connects, and saves what it sends", async () => {
		const ws = new WebSocket(`ws://127.0.0.1:${PORT}`);
		const first = await new Promise<{
			event: string;
			document: DesignDocument;
		}>((resolve) =>
			ws.once("message", (data) => resolve(JSON.parse(String(data))))
		);
		expect(first.event).toBe("load_document");
		expect(first.document.changes).toHaveLength(1);

		const edited = structuredClone(first.document);
		const title = edited.layers[0].children?.[0];
		if (title) title.value = "Edited in the browser";
		ws.send(JSON.stringify({ event: "document", document: edited }));
		await new Promise((r) => setTimeout(r, 200));
		expect(saved().layers[0].children?.[0].value).toBe("Edited in the browser");
		ws.close();
	});
});
