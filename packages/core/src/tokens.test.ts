import { describe, expect, it } from "vitest";
import {
	allModes,
	checkTokens,
	indexTokens,
	isComposed,
	matchingToken,
	pickModeValue,
	referencesOf,
	resolveToken,
	resolveTokenValue,
	type Token,
	tokenCssName,
	tokenFromCssValue,
	tokensToCssVars,
} from "./tokens";

const ORDER = ["mobile", "tablet", "desktop"];

const tokens: Token[] = [
	{
		path: "color.neutral.0",
		type: "color",
		tier: "primitive",
		value: "#ffffff",
	},
	{
		path: "color.neutral.950",
		type: "color",
		tier: "primitive",
		value: "#0c0c0e",
	},
	{
		path: "color.bg.page",
		type: "color",
		tier: "semantic",
		value: "{color.neutral.0}",
		modes: [{ when: { theme: "dark" }, value: "{color.neutral.950}" }],
	},
	{
		path: "type.display",
		type: "dimension",
		tier: "semantic",
		value: "40px",
		modes: [{ when: { breakpoint: "desktop" }, value: "88px" }],
	},
	{
		path: "button.bg",
		type: "color",
		tier: "component",
		value: "{color.bg.page}",
	},
];

describe("names", () => {
	it("turns paths into CSS custom properties like Style Dictionary", () => {
		expect(tokenCssName("color.bg.page")).toBe("--color-bg-page");
	});

	it("reads a token back out of a var() value", () => {
		expect(tokenFromCssValue("var(--color-bg-page)", tokens)?.path).toBe(
			"color.bg.page"
		);
		expect(tokenFromCssValue("#fff", tokens)).toBeUndefined();
		expect(tokenFromCssValue("var(--nope)", tokens)).toBeUndefined();
	});
});

describe("pickModeValue", () => {
	const t = (modes: Token["modes"]): Token => ({
		path: "x",
		type: "color",
		tier: "semantic",
		value: "default",
		modes,
	});

	it("falls back to the default", () => {
		expect(
			pickModeValue(t([{ when: { theme: "dark" }, value: "d" }]), {
				theme: "light",
			})
		).toBe("default");
	});

	it("prefers the entry naming more dimensions", () => {
		const token = t([
			{ when: { brand: "b", theme: "dark" }, value: "both" },
			{ when: { theme: "dark" }, value: "theme" },
		]);
		expect(pickModeValue(token, { brand: "b", theme: "dark" })).toBe("both");
		expect(pickModeValue(token, { brand: "a", theme: "dark" })).toBe("theme");
	});

	it("cascades breakpoints mobile-first", () => {
		const token = t([{ when: { breakpoint: "tablet" }, value: "tablet" }]);
		expect(pickModeValue(token, { breakpoint: "mobile" }, ORDER)).toBe(
			"default"
		);
		expect(pickModeValue(token, { breakpoint: "tablet" }, ORDER)).toBe(
			"tablet"
		);
		expect(pickModeValue(token, { breakpoint: "desktop" }, ORDER)).toBe(
			"tablet"
		);
	});

	it("lets the nearest larger breakpoint win", () => {
		const token = t([
			{ when: { breakpoint: "desktop" }, value: "desktop" },
			{ when: { breakpoint: "tablet" }, value: "tablet" },
		]);
		expect(pickModeValue(token, { breakpoint: "desktop" }, ORDER)).toBe(
			"desktop"
		);
	});
});

describe("resolveToken", () => {
	const byPath = indexTokens(tokens);

	it("follows aliases per mode", () => {
		expect(resolveToken("button.bg", { theme: "dark" }, byPath).value).toBe(
			"#0c0c0e"
		);
		expect(resolveToken("button.bg", { theme: "light" }, byPath).chain).toEqual(
			["button.bg", "color.bg.page", "color.neutral.0"]
		);
	});

	it("reports missing targets, loops and type mismatches", () => {
		const broken = indexTokens([
			{ path: "a", type: "color", tier: "semantic", value: "{missing}" },
			{ path: "b", type: "color", tier: "semantic", value: "{c}" },
			{ path: "c", type: "color", tier: "semantic", value: "{b}" },
			{ path: "d", type: "dimension", tier: "semantic", value: "{e}" },
			{ path: "e", type: "color", tier: "primitive", value: "#000" },
		]);
		expect(resolveToken("a", {}, broken).error?.kind).toBe("unresolved");
		expect(resolveToken("b", {}, broken).error?.kind).toBe("circular");
		expect(resolveToken("d", {}, broken).error?.kind).toBe("type");
	});
});

describe("tokensToCssVars", () => {
	it("writes each frame's values", () => {
		expect(
			tokensToCssVars(tokens, { theme: "light", breakpoint: "desktop" }, ORDER)
		).toMatchObject({ "--color-bg-page": "#ffffff", "--type-display": "88px" });
	});
});

describe("matchingToken", () => {
	it("finds a semantic token for a hardcoded value, default mode first", () => {
		const modes = allModes({ theme: ["light", "dark"] });
		expect(matchingToken("#FFFFFF", "color", tokens, modes)?.path).toBe(
			"color.bg.page"
		);
		expect(matchingToken("#0c0c0e", "color", tokens, modes)?.path).toBe(
			"color.bg.page"
		);
		expect(matchingToken("#123456", "color", tokens, modes)).toBeUndefined();
	});
});

describe("checkTokens", () => {
	it("flags a mode that was left out", () => {
		const issues = checkTokens(
			[
				{
					path: "border",
					type: "color",
					tier: "semantic",
					value: "#eee",
					modes: [{ when: { theme: "light" }, value: "#ddd" }],
				},
			],
			{ theme: ["light", "dark"] }
		);
		expect(issues.map((issue) => issue.id)).toEqual([
			"missing:border:theme:dark",
		]);
	});

	it("reports a loop once", () => {
		const issues = checkTokens(
			[
				{ path: "b", type: "color", tier: "semantic", value: "{c}" },
				{ path: "c", type: "color", tier: "semantic", value: "{b}" },
			],
			{}
		);
		expect(issues).toHaveLength(1);
	});

	it("passes a clean set", () => {
		expect(checkTokens(tokens, { theme: ["light", "dark"] }, ORDER)).toEqual(
			[]
		);
	});
});

describe("composed values", () => {
	const composed: Token[] = [
		{
			path: "brand",
			type: "color",
			tier: "primitive",
			value: "#f2545b",
			modes: [{ when: { brand: "b" }, value: "#2f7fd8" }],
		},
		{ path: "white", type: "color", tier: "primitive", value: "#ffffff" },
		{ path: "muted", type: "number", tier: "primitive", value: "0.5" },
		{ path: "space", type: "dimension", tier: "primitive", value: "8px" },
		{
			path: "tint",
			type: "color",
			tier: "semantic",
			value: "color-mix(in oklch, {brand} 40%, {white})",
		},
		{
			path: "faded",
			type: "color",
			tier: "semantic",
			value: "oklch(from {brand} l c h / {muted})",
		},
		{
			path: "double",
			type: "dimension",
			tier: "semantic",
			value: "calc({space} * 2)",
		},
		{ path: "on-tint", type: "color", tier: "component", value: "{tint}" },
	];
	const byPath = indexTokens(composed);

	it("substitutes every reference, of any type, per mode", () => {
		expect(resolveToken("tint", {}, byPath).value).toBe(
			"color-mix(in oklch, #f2545b 40%, #ffffff)"
		);
		expect(resolveToken("tint", { brand: "b" }, byPath).value).toBe(
			"color-mix(in oklch, #2f7fd8 40%, #ffffff)"
		);
		expect(resolveToken("faded", {}, byPath).value).toBe(
			"oklch(from #f2545b l c h / 0.5)"
		);
		expect(resolveToken("double", {}, byPath).value).toBe("calc(8px * 2)");
	});

	it("aliases a composed token and lists everything it reads", () => {
		const r = resolveToken("on-tint", {}, byPath);
		expect(r.value).toBe("color-mix(in oklch, #f2545b 40%, #ffffff)");
		expect(r.chain).toEqual(["on-tint", "tint"]);
		expect(r.deps.sort()).toEqual(["brand", "on-tint", "tint", "white"]);
	});

	it("reports missing references and loops through compositions", () => {
		const broken = indexTokens([
			{
				path: "a",
				type: "color",
				tier: "semantic",
				value: "color-mix(in oklch, {nope} 50%, white)",
			},
			{
				path: "b",
				type: "dimension",
				tier: "semantic",
				value: "calc({c} + 1px)",
			},
			{
				path: "c",
				type: "dimension",
				tier: "semantic",
				value: "calc({b} + 1px)",
			},
		]);
		expect(resolveToken("a", {}, broken).error).toEqual({
			kind: "unresolved",
			missing: "nope",
		});
		expect(resolveToken("b", {}, broken).error?.kind).toBe("circular");
	});

	it("resolves a value that isn't a token yet", () => {
		expect(resolveTokenValue("calc({space} + {space})", {}, byPath).value).toBe(
			"calc(8px + 8px)"
		);
		expect(referencesOf("rgb(from {brand} r g b / {muted})")).toEqual([
			"brand",
			"muted",
		]);
		expect(isComposed("{brand}")).toBe(false);
		expect(isComposed("calc({space} * 2)")).toBe(true);
	});
});
