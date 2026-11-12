import { describe, expect, it } from "vitest";
import {
	dependentsOf,
	guessTokenType,
	importCandidates,
	modeNameProblem,
	pathProblem,
	removeDimension,
	removeModeValue,
	renameDimension,
	renameModeValue,
	renameToken,
	scanCssVariables,
	setModeValue,
} from "./tokenEdits";
import type { Token } from "./tokens";

const tokens: Token[] = [
	{
		path: "color.neutral.0",
		type: "color",
		tier: "primitive",
		value: "#ffffff",
	},
	{
		path: "color.bg.page",
		type: "color",
		tier: "semantic",
		value: "{color.neutral.0}",
	},
	{ path: "space.6", type: "dimension", tier: "primitive", value: "24px" },
];

describe("pathProblem", () => {
	it("accepts dotted names and rejects taken or malformed ones", () => {
		expect(pathProblem("color.text.primary", tokens)).toBeNull();
		expect(pathProblem("color.bg.page", tokens)).toBe("That name is taken");
		expect(pathProblem("color.bg.page", tokens, "color.bg.page")).toBeNull();
		expect(pathProblem("color bg", tokens)).not.toBeNull();
		expect(pathProblem("", tokens)).not.toBeNull();
	});

	it("rejects a name that makes the same CSS variable", () => {
		expect(pathProblem("color-bg.page", tokens)).toBe("That name is taken");
	});
});

describe("setModeValue", () => {
	const token = tokens[1];
	it("adds, replaces and removes a mode's value", () => {
		const dark = setModeValue(token, { theme: "dark" }, "#000");
		expect(dark.modes).toEqual([{ when: { theme: "dark" }, value: "#000" }]);
		expect(setModeValue(dark, { theme: "dark" }, "#111").modes).toEqual([
			{ when: { theme: "dark" }, value: "#111" },
		]);
		expect(setModeValue(dark, { theme: "dark" }, null).modes).toBeUndefined();
	});
});

describe("renameToken", () => {
	it("renames the token and the aliases that point at it", () => {
		const next = renameToken(tokens, "color.neutral.0", "color.white");
		expect(next[0].path).toBe("color.white");
		expect(next[1].value).toBe("{color.white}");
		expect(dependentsOf(next, "color.white").map((t) => t.path)).toEqual([
			"color.bg.page",
		]);
	});
});

describe("renameToken in composed values", () => {
	it("rewrites references inside functions", () => {
		const next = renameToken(
			[
				...tokens,
				{
					path: "tint",
					type: "color",
					tier: "semantic",
					value: "color-mix(in oklch, {color.neutral.0} 40%, black)",
				},
			],
			"color.neutral.0",
			"white"
		);
		expect(next.at(-1)?.value).toBe("color-mix(in oklch, {white} 40%, black)");
		expect(dependentsOf(next, "white").map((t) => t.path)).toEqual([
			"color.bg.page",
			"tint",
		]);
	});
});

describe("guessTokenType", () => {
	it.each([
		["#fff", "color"],
		["oklch(60% 0.2 260)", "color"],
		["16px", "dimension"],
		["1.5", "number"],
		["0 1px 2px rgb(0 0 0 / 0.2)", "shadow"],
		["Inter, sans-serif", "fontFamily"],
	])("%s is a %s", (value, type) => {
		expect(guessTokenType(value)).toBe(type);
	});
});

describe("scanCssVariables", () => {
	it("finds custom properties, inside media queries too, and skips comments", () => {
		const css = `
			:root { --brand: #f2545b; /* --old: 1px; */ color: red; --gap: 24px }
			@media (min-width: 900px) { .page { --gap: 48px; } }
		`;
		expect(scanCssVariables(css)).toEqual([
			{ name: "--brand", value: "#f2545b", selector: ":root" },
			{ name: "--gap", value: "24px", selector: ":root" },
			{ name: "--gap", value: "48px", selector: ".page" },
		]);
	});
});

describe("importCandidates", () => {
	const resolve = (path: string) =>
		({
			"color.neutral.0": "#ffffff",
			"color.bg.page": "#ffffff",
			"space.6": "24px",
		})[path];

	it("sorts variables into new, same, duplicate, conflict and broken", () => {
		const found = importCandidates(
			scanCssVariables(`
				:root {
					--brand-red: #f2545b;
					--accent: var(--brand-red);
					--space-6: 24px;
					--color-bg-page: #000;
					--gutter: 24px;
					--heading: var(--font-display);
				}
			`),
			tokens,
			resolve
		);
		const status = Object.fromEntries(
			found.map((c) => [c.name, c.status.kind])
		);
		expect(status).toEqual({
			"--brand-red": "new",
			"--accent": "new",
			"--space-6": "same",
			"--color-bg-page": "conflict",
			"--gutter": "duplicate",
			"--heading": "broken",
		});
		// --gutter duplicates space.6, so a variable reading it aliases space.6.
		const spaced = importCandidates(
			scanCssVariables(":root { --gutter: 24px; --gap: var(--gutter); }"),
			tokens,
			resolve
		);
		expect(spaced.find((c) => c.name === "--gap")?.tokenValue).toBe(
			"{space.6}"
		);
		const accent = found.find((c) => c.name === "--accent");
		expect(accent?.tokenValue).toBe("{brand.red}");
		expect(accent?.type).toBe("color");
	});
});

describe("editing modes", () => {
	const themed: Token[] = [
		{
			path: "bg",
			type: "color",
			tier: "semantic",
			value: "#fff",
			modes: [
				{ when: { theme: "dark" }, value: "#000" },
				{ when: { theme: "dark", brand: "b" }, value: "#111" },
				{ when: { brand: "b" }, value: "#eee" },
			],
		},
	];

	it("renames a mode value everywhere", () => {
		const next = renameModeValue(themed, "theme", "dark", "dim");
		expect(next[0].modes?.map((e) => e.when.theme)).toEqual([
			"dim",
			"dim",
			undefined,
		]);
	});

	it("removes a mode value's entries", () => {
		expect(removeModeValue(themed, "theme", "dark")[0].modes).toEqual([
			{ when: { brand: "b" }, value: "#eee" },
		]);
	});

	it("renames and removes a dimension", () => {
		expect(
			renameDimension(themed, "brand", "client")[0].modes?.[2].when
		).toEqual({ client: "b" });
		expect(removeDimension(themed, "brand")[0].modes).toEqual([
			{ when: { theme: "dark" }, value: "#000" },
		]);
		expect(
			removeDimension(removeDimension(themed, "brand"), "theme")[0].modes
		).toBeUndefined();
	});

	it("checks mode names", () => {
		expect(modeNameProblem("high-contrast", ["light", "dark"])).toBeNull();
		expect(modeNameProblem("dark", ["light", "dark"])).toBe(
			"That name is taken"
		);
		expect(modeNameProblem("two words", [])).not.toBeNull();
	});
});
