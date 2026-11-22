import { describe, expect, it } from "vitest";
import { normalize } from "./layerTree";
import type { Action } from "./reducer";
import {
	allowed,
	checkAction,
	checkDocument,
	type Rule,
	type RulesContext,
	valueProblem,
} from "./rules";
import type { Breakpoint, Layer } from "./types";

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

const text = (id: string, extra: Partial<Layer> = {}): Layer => ({
	id,
	name: id[0].toUpperCase() + id.slice(1),
	type: "text",
	value: "Hello",
	...extra,
});

const layers: Layer[] = [
	{
		id: "hero",
		name: "Hero",
		type: "frame",
		value: "",
		children: [
			text("title"),
			text("intro"),
			{ id: "pic", name: "Pic", type: "image", value: "a.png" },
		],
	},
	text("footer"),
];

const ctx = (rules: Rule[]): RulesContext => ({
	nodes: normalize(layers).nodes,
	breakpoints,
	rules,
});

const css = (
	id: string,
	values: Record<string, string>,
	breakpointId?: string
): Action => ({
	type: "UPDATE_LAYER_CSS",
	payload: { id, css: values, breakpointId },
});

const rule = (r: Partial<Rule> & { id: string }): Rule => ({
	target: {},
	...r,
});

describe("roles", () => {
	const locked = ctx([
		rule({ id: "no-size", editableProperties: ["--color"] }),
	]);

	it("limits the editor role", () => {
		expect(
			checkAction(locked, css("title", { "--font-size": "20px" }), "editor")
		).toMatchObject({
			ruleId: "no-size",
		});
	});

	it("never limits the builder role", () => {
		expect(
			checkAction(locked, css("title", { "--font-size": "20px" }), "builder")
		).toBeNull();
		expect(allowed(locked, "title", "builder").editableProperties).toBeNull();
	});

	it("allows everything when there are no rules", () => {
		expect(
			checkAction(ctx([]), css("title", { "--font-size": "20px" }), "editor")
		).toBeNull();
	});
});

describe("targeting", () => {
	it("targets layers by type", () => {
		const c = ctx([
			rule({
				id: "text-locked",
				target: { layerTypes: ["text"] },
				content: "locked",
			}),
		]);
		const edit = (id: string): Action => ({
			type: "UPDATE_LAYER_VALUE",
			payload: { id, value: "x" },
		});
		expect(checkAction(c, edit("title"), "editor")?.ruleId).toBe("text-locked");
		expect(checkAction(c, edit("pic"), "editor")).toBeNull();
	});

	it("targets specific layers, and their children only when asked", () => {
		const own = ctx([
			rule({
				id: "hero-only",
				target: { layerIds: ["hero"] },
				content: "locked",
			}),
		]);
		const edit: Action = {
			type: "UPDATE_LAYER_VALUE",
			payload: { id: "title", value: "x" },
		};
		expect(checkAction(own, edit, "editor")).toBeNull();
		const deep = ctx([
			rule({
				id: "hero-deep",
				target: { layerIds: ["hero"], includeChildren: true },
				content: "locked",
			}),
		]);
		expect(checkAction(deep, edit, "editor")?.ruleId).toBe("hero-deep");
		expect(
			checkAction(
				deep,
				{ type: "UPDATE_LAYER_VALUE", payload: { id: "footer", value: "x" } },
				"editor"
			)
		).toBeNull();
	});
});

describe("editable properties", () => {
	const c = ctx([
		rule({ id: "colors-only", editableProperties: ["group:color"] }),
	]);

	it("allows listed properties, including by group", () => {
		expect(
			checkAction(c, css("title", { "--background-color": "red" }), "editor")
		).toBeNull();
	});

	it("blocks the rest, naming the layer and property", () => {
		const r = checkAction(c, css("title", { "--font-size": "20px" }), "editor");
		expect(r).toEqual({
			ruleId: "colors-only",
			message: "Title's font size can't be changed",
		});
	});

	it("uses the rule's own message when it has one", () => {
		const own = ctx([
			rule({
				id: "brand",
				editableProperties: ["--color"],
				message: "Brand styles are fixed",
			}),
		]);
		expect(
			checkAction(own, css("title", { "--width": "1px" }), "editor")?.message
		).toBe("Brand styles are fixed");
	});
});

describe("allowed values", () => {
	it("tokens only", () => {
		const c = ctx([
			rule({ id: "tokens", values: { "group:color": { tokensOnly: true } } }),
		]);
		expect(
			checkAction(c, css("title", { "--color": "var(--color-text)" }), "editor")
		).toBeNull();
		expect(
			checkAction(c, css("title", { "--color": "#ff0000" }), "editor")?.message
		).toBe("Title's color: use a token");
	});

	it("a numeric range with a unit", () => {
		const c = ctx([
			rule({
				id: "sizes",
				values: { "--font-size": { min: 12, max: 48, unit: "px" } },
			}),
		]);
		expect(
			checkAction(c, css("title", { "--font-size": "24px" }), "editor")
		).toBeNull();
		expect(
			checkAction(c, css("title", { "--font-size": "64px" }), "editor")?.message
		).toMatch(/at most 48px/);
		expect(
			checkAction(c, css("title", { "--font-size": "2rem" }), "editor")?.message
		).toMatch(/use px/);
	});

	it("a fixed list", () => {
		const c = ctx([
			rule({
				id: "align",
				values: { "--text-align": { oneOf: ["left", "center"] } },
			}),
		]);
		expect(
			checkAction(c, css("title", { "--text-align": "center" }), "editor")
		).toBeNull();
		expect(
			checkAction(c, css("title", { "--text-align": "right" }), "editor")
		).not.toBeNull();
	});

	it("lets a value be cleared back to what it inherits", () => {
		const c = ctx([
			rule({ id: "tokens", values: { "--color": { tokensOnly: true } } }),
		]);
		expect(
			checkAction(c, css("title", { "--color": "" }), "editor")
		).toBeNull();
	});

	it("checks values in isolation", () => {
		expect(valueProblem("10", { min: 0, max: 5 })).toMatch(/at most 5/);
		expect(valueProblem("auto", { min: 0 })).toBe("use a number");
	});
});

describe("content", () => {
	it("locks text and image sources", () => {
		const c = ctx([
			rule({
				id: "copy",
				target: { layerTypes: ["text", "image"] },
				content: "locked",
			}),
		]);
		expect(
			checkAction(
				c,
				{ type: "UPDATE_LAYER_VALUE", payload: { id: "pic", value: "b.png" } },
				"editor"
			)?.message
		).toBe("Pic's content is locked");
	});
});

describe("structure", () => {
	const add = (
		type: string,
		targetLayerId: string,
		position: "inside" | "after"
	): Action => ({
		type: "ADD_LAYER",
		payload: {
			layer: { id: "new", name: "New", type, value: "" },
			targetLayerId,
			position,
		},
	});

	it("a locked layer can't gain, lose or reorder layers", () => {
		const c = ctx([
			rule({
				id: "hero-locked",
				target: { layerIds: ["hero"] },
				structure: { locked: true },
			}),
		]);
		expect(
			checkAction(c, add("text", "hero", "inside"), "editor")?.ruleId
		).toBe("hero-locked");
		expect(
			checkAction(c, add("text", "title", "after"), "editor")?.ruleId
		).toBe("hero-locked");
		expect(
			checkAction(
				c,
				{ type: "DELETE_LAYERS", payload: { layerIds: ["intro"] } },
				"editor"
			)?.message
		).toBe("Hero is locked: its layers can't be added, removed or moved");
		expect(
			checkAction(
				c,
				{
					type: "MOVE_LAYER",
					payload: {
						layerIds: ["title"],
						targetId: "intro",
						position: "after",
					},
				},
				"editor"
			)
		).not.toBeNull();
		expect(checkAction(c, add("text", "footer", "after"), "editor")).toBeNull();
	});

	it("only allowed types can be added", () => {
		const c = ctx([
			rule({
				id: "text-only",
				target: { layerIds: ["hero"] },
				structure: { allowedChildren: ["text"] },
			}),
		]);
		expect(checkAction(c, add("text", "hero", "inside"), "editor")).toBeNull();
		expect(
			checkAction(c, add("image", "hero", "inside"), "editor")?.message
		).toBe("Hero can only hold text");
	});

	it("keeps the number of children within bounds", () => {
		const c = ctx([
			rule({
				id: "count",
				target: { layerIds: ["hero"] },
				structure: { minChildren: 3, maxChildren: 3 },
			}),
		]);
		expect(
			checkAction(c, add("text", "hero", "inside"), "editor")?.message
		).toBe("Hero holds at most 3");
		expect(
			checkAction(
				c,
				{ type: "DELETE_LAYERS", payload: { layerIds: ["intro"] } },
				"editor"
			)?.message
		).toBe("Hero needs at least 3");
	});

	it("moving out of a layer counts as removing from it", () => {
		const c = ctx([
			rule({
				id: "min",
				target: { layerIds: ["hero"] },
				structure: { minChildren: 3 },
			}),
		]);
		expect(
			checkAction(
				c,
				{
					type: "MOVE_LAYER",
					payload: {
						layerIds: ["title"],
						targetId: "footer",
						position: "after",
					},
				},
				"editor"
			)?.ruleId
		).toBe("min");
	});
});

describe("breakpoint overrides", () => {
	const c = ctx([rule({ id: "one-size", breakpointOverrides: false })]);

	it("blocks overrides at larger breakpoints, not base styles", () => {
		expect(
			checkAction(
				c,
				css("title", { "--font-size": "40px" }, "desktop"),
				"editor"
			)?.ruleId
		).toBe("one-size");
		expect(
			checkAction(
				c,
				css("title", { "--font-size": "40px" }, "mobile"),
				"editor"
			)
		).toBeNull();
	});
});

describe("checkDocument", () => {
	it("reports a tokens-only colour set to a hex value", () => {
		const doc = {
			layers: [text("title", { cssVars: { "--color": "#ff0000" } })],
			breakpoints,
			rules: [
				rule({ id: "tokens", values: { "group:color": { tokensOnly: true } } }),
			],
		};
		expect(checkDocument(doc)).toEqual([
			{
				ruleId: "tokens",
				message: "Title's color: use a token",
				layerId: "title",
				property: "--color",
			},
		]);
	});

	it("reports a locked frame with an extra child", () => {
		const doc = {
			layers,
			breakpoints,
			rules: [
				rule({
					id: "hero-two",
					target: { layerIds: ["hero"] },
					structure: { locked: true, maxChildren: 2 },
				}),
			],
		};
		expect(checkDocument(doc)).toEqual([
			{
				ruleId: "hero-two",
				message: "Hero holds at most 2, but has 3",
				layerId: "hero",
			},
		]);
	});

	it("reports nothing for a document that follows its rules", () => {
		expect(checkDocument({ layers, breakpoints, rules: [] })).toEqual([]);
	});
});
