/**
 * Every example the docs show is a real module: it compiles with the rest of
 * the project (tsc), imports only the packages' entry points, and does what
 * the docs say it does.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
	checkDocument,
	type DesignDocument,
	rulesSchema,
} from "@design-ui/core";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Launch, toHtml } from "./Delivery";
import { Quickstart } from "./Quickstart";
import { rules } from "./rules";

afterEach(cleanup);

/** Deep imports into the packages, or reaching outside the examples. */
const NOT_PUBLIC = /^(@design-ui\/[^/]+\/(?!styles\.css$)|\.\.\/|.*\/src\/)/;
const dir = __dirname;
const examples = readdirSync(dir).filter(
	(f) => /\.tsx?$/.test(f) && !f.includes(".test.")
);

const doc: DesignDocument = {
	version: 1,
	layers: [{ id: "title", name: "Title", type: "text", value: "Hello" }],
	breakpoints: [
		{ id: "m", name: "M", width: 375, height: 667, position: { x: 0, y: 0 } },
	],
	frameStyles: {},
	tokens: [],
	tokenDimensions: {},
	rules: [],
	annotations: [],
	changes: [],
};

describe("the docs' examples", () => {
	it.each(examples)("%s imports only the packages' entry points", (file) => {
		const source = readFileSync(join(dir, file), "utf8");
		const imported = [...source.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
		expect(imported.filter((name) => NOT_PUBLIC.test(name))).toEqual([]);
	});

	it("quickstart: an editor with rules, in under 30 lines", () => {
		const lines = readFileSync(join(dir, "Quickstart.tsx"), "utf8")
			.trimEnd()
			.split("\n");
		expect(lines.length).toBeLessThan(30);
		render(<Quickstart editAs="editor" />);
		expect(
			document.querySelector("[data-slot='designer-canvas']")
		).not.toBeNull();
	});

	it("rules: the sample rule set is valid", () => {
		expect(rulesSchema.safeParse(rules).success).toBe(true);
		expect(checkDocument({ ...doc, rules })).toEqual([]);
	});

	it("delivery: renders a saved file, and exports a page", () => {
		const { container } = render(<Launch file={doc} />);
		expect(container.textContent).toContain("Hello");
		expect(render(<Launch file={{}} />).container.textContent).toContain(
			"can't be shown"
		);
		expect(toHtml(doc)).toContain("<title>Spring launch</title>");
	});
});
