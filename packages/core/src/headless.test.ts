import { describe, expect, it } from "vitest";
import { type AgentRequest, handleAgentRequest } from "./agentProtocol";
import type { DesignDocument } from "./document";
import { createHeadlessEditor } from "./headless";

const design = (): DesignDocument => ({
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
			id: "page-layout",
			target: { layerIds: ["page"] },
			structure: { locked: true },
		},
		{
			id: "title-type",
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
});

// Omit per member, so each method keeps its own params.
type Request = AgentRequest extends infer R
	? R extends unknown
		? Omit<R, "id">
		: never
	: never;

const ask = (
	editor: ReturnType<typeof createHeadlessEditor>,
	request: Request
) => handleAgentRequest({ id: "1", ...request } as AgentRequest, editor);

describe("the headless editor", () => {
	it("works a task end to end within the rules", () => {
		const editor = createHeadlessEditor(design());
		ask(editor, { method: "claim_task", params: { taskId: "t1" } });

		expect(
			ask(editor, {
				method: "apply_changes",
				params: {
					taskId: "t1",
					reason: "Red, as asked",
					actions: [
						{
							type: "UPDATE_LAYER_CSS",
							payload: { id: "title", css: { "--color": "red" } },
						},
					],
				},
			})
		).toEqual({ applied: 1 });

		expect(() =>
			ask(editor, {
				method: "apply_changes",
				params: {
					taskId: "t1",
					reason: "Bigger too",
					actions: [
						{
							type: "UPDATE_LAYER_CSS",
							payload: { id: "title", css: { "--font-size": "40px" } },
						},
					],
				},
			})
		).toThrow('breaks the rule "title-type"');

		expect(() =>
			ask(editor, {
				method: "apply_changes",
				params: {
					reason: "Tidy up",
					actions: [
						{ type: "DELETE_LAYERS", payload: { layerIds: ["title"] } },
					],
				},
			})
		).toThrow('breaks the rule "page-layout"');

		ask(editor, {
			method: "resolve_task",
			params: { taskId: "t1", summary: "Done" },
		});

		const doc = editor.document();
		expect(doc.layers[0].children?.[0].cssVars).toEqual({
			"--font-size": "24px",
			"--color": "red",
		});
		expect(doc.changes).toHaveLength(1);
		expect(doc.changes[0]).toMatchObject({
			actor: { kind: "agent" },
			reason: "Red, as asked",
			taskId: "t1",
			undoable: true,
			changes: [
				{ layerId: "title", property: "--color", from: undefined, to: "red" },
			],
		});
		const task = doc.annotations.find((a) => a.id === "t1");
		expect(task?.status).toBe("resolved");
		expect(task?.claimedBy?.kind).toBe("agent");
		expect(task?.replies.at(-1)?.body).toBe("Done");
	});

	it("turns a reason outside a task into a note on the change", () => {
		const editor = createHeadlessEditor({ ...design(), rules: [] });
		ask(editor, {
			method: "apply_changes",
			params: {
				reason: "Bigger reads better",
				actions: [
					{
						type: "UPDATE_LAYER_CSS",
						payload: { id: "title", css: { "--font-size": "32px" } },
					},
				],
			},
		});
		const note = editor.document().annotations.find((a) => a.kind === "note");
		expect(note).toMatchObject({
			body: "Bigger reads better",
			entryId: editor.document().changes[0].id,
		});
	});

	it("tells an agent its limits before it acts", () => {
		const editor = createHeadlessEditor(design());
		expect(ask(editor, { method: "get_rules" })).toMatchObject({
			rules: [{ id: "page-layout" }, { id: "title-type" }],
		});
		expect(
			ask(editor, { method: "allowed_changes", params: { layerId: "title" } })
		).toMatchObject({ editableProperties: ["--color"], content: true });
		expect(
			ask(editor, { method: "allowed_changes", params: { layerId: "page" } })
		).toMatchObject({ structureLocked: true });
	});

	it("checks the document and exports it as HTML", () => {
		const editor = createHeadlessEditor(design());
		expect(ask(editor, { method: "check_document" })).toEqual({
			violations: [],
		});
		const { html, css } = ask(editor, { method: "export_html" }) as {
			html: string;
			css: string;
		};
		expect(html).toContain('<p class="e">Hello</p>');
		expect(css).toContain("font-size:24px");
	});

	it("tells listeners when something changes, to save the file", () => {
		const editor = createHeadlessEditor(design());
		let saves = 0;
		editor.onChange(() => saves++);
		ask(editor, { method: "claim_task", params: { taskId: "t1" } });
		expect(saves).toBe(1);
	});
});
