import { describe, expect, it } from "vitest";
import { groupLayerPresets, layerFromPreset } from "./layerPresets";
import { frameLayer } from "./layers/frame";
import { imageLayer } from "./layers/image";
import { textLayer } from "./layers/text";
import type { LayerDefinition } from "./types";

const custom: LayerDefinition = {
	type: "badge",
	name: "Badge",
	description: "A small status label",
	defaultValues: { name: "Badge", value: "New" },
};

describe("groupLayerPresets", () => {
	it("orders built-in groups first and lists custom types under More layers", () => {
		const groups = groupLayerPresets([
			custom,
			imageLayer,
			textLayer,
			frameLayer,
		]);
		expect(groups.map((g) => g.name)).toEqual([
			"Layout",
			"Text",
			"Media",
			"More layers",
		]);
		expect(groups[3].entries[0].preset).toMatchObject({
			label: "Badge",
			description: "A small status label",
		});
	});

	it("gives every entry a unique key", () => {
		const keys = groupLayerPresets([frameLayer, textLayer])
			.flatMap((g) => g.entries)
			.map((e) => e.key);
		expect(new Set(keys).size).toBe(keys.length);
	});
});

describe("layerFromPreset", () => {
	it("merges the preset over the type's defaults and sets the element", () => {
		const entry = groupLayerPresets([textLayer])[0].entries.find(
			(e) => e.preset.id === "h2"
		);
		if (!entry) throw new Error("missing h2 preset");
		const layer = layerFromPreset(entry, "new");
		expect(layer).toMatchObject({
			id: "new",
			type: "text",
			name: "Heading 2",
			elementType: "h2",
			cssVars: { "--font-size": "32px", "--font-weight": "600" },
		});
	});

	it("keeps the type's defaults for a plain preset", () => {
		const entry = groupLayerPresets([frameLayer])[0].entries[0];
		const layer = layerFromPreset(entry, "new");
		expect(layer.elementType).toBeUndefined();
		expect(layer.cssVars).toEqual(frameLayer.defaultValues.cssVars);
	});
});
