import { loadDocument } from "@design-ui/core";
import schema from "@design-ui/core/schema/document.v1.json";
import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import { demoAnnotations } from "./annotations";
import { demoBreakpoints, demoLayers } from "./design";
import { demoTokenDimensions, demoTokens } from "./tokens";

// The demo exactly as the editor exports it, built from its sources.
const demoDocument = () =>
	JSON.parse(
		JSON.stringify({
			version: 1,
			exportedAt: new Date().toISOString(),
			layers: demoLayers,
			breakpoints: demoBreakpoints,
			frameStyles: { "--font-family": "var(--font-family-body)" },
			tokens: demoTokens,
			tokenDimensions: demoTokenDimensions,
			rules: [],
			annotations: demoAnnotations,
			changes: [],
		})
	);

const validate = new Ajv2020({ allErrors: true, strict: false }).compile(
	schema
);

describe("the demo document", () => {
	it("passes the published JSON Schema", () => {
		const valid = validate(demoDocument());
		expect(validate.errors ?? []).toEqual([]);
		expect(valid).toBe(true);
	});

	it("fails the JSON Schema with a malformed layer", () => {
		const doc = demoDocument();
		const { type: _, ...untyped } = doc.layers[0].children[0];
		doc.layers[0].children[0] = untyped;
		expect(validate(doc)).toBe(false);
		expect(validate.errors?.[0].instancePath).toBe("/layers/0/children/0");
	});

	it("loads with loadDocument", () => {
		expect(loadDocument(demoDocument()).ok).toBe(true);
	});
});
