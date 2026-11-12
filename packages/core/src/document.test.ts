import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { documentJsonSchema, loadDocument } from "./document";

const minimal = {
	version: 1,
	layers: [{ id: "page", name: "Page", type: "frame", value: "" }],
	breakpoints: [
		{
			id: "mobile",
			name: "Mobile",
			width: 375,
			height: 667,
			position: { x: 0, y: 0 },
		},
	],
};

describe("loadDocument", () => {
	it("accepts a hand-written v1 document and fills in the optional parts", () => {
		const result = loadDocument(JSON.stringify(minimal));
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.document).toMatchObject({
			version: 1,
			frameStyles: {},
			tokens: [],
			tokenDimensions: {},
			rules: [],
			annotations: [],
			changes: [],
		});
	});

	it("names the path of a malformed nested layer", () => {
		const bad = structuredClone(minimal) as Record<string, unknown>;
		(bad.layers as Record<string, unknown>[])[0].children = [
			{ id: "t", name: "Title", value: "Hi" },
		];
		const result = loadDocument(bad);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.problems.map((p) => p.path)).toContain(
			"layers.0.children.0.type"
		);
	});

	it("rejects text that isn't JSON", () => {
		const result = loadDocument("{ nope");
		expect(result.ok).toBe(false);
		if (!result.ok)
			expect(result.problems[0].message).toMatch(/Not valid JSON/);
	});

	it("rejects a document without a version, or from a newer version", () => {
		const { version: _, ...unversioned } = minimal;
		const missing = loadDocument(unversioned);
		expect(!missing.ok && missing.problems[0].path).toBe("version");
		const newer = loadDocument({ ...minimal, version: 2 });
		expect(!newer.ok && newer.problems[0].message).toMatch(/newer/);
	});

	it("requires at least one breakpoint", () => {
		const result = loadDocument({ ...minimal, breakpoints: [] });
		expect(!result.ok && result.problems[0].path).toBe("breakpoints");
	});
});

describe("JSON Schema", () => {
	it("matches the committed schema file (run `bun run schema` to update)", () => {
		const committed = JSON.parse(
			readFileSync(
				new URL("../schema/document.v1.json", import.meta.url),
				"utf8"
			)
		);
		expect(committed).toEqual(documentJsonSchema());
	});
});
