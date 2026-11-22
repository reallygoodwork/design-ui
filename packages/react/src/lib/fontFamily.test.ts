import { describe, expect, it } from "vitest";
import { primaryFontFamily } from "./fontFamily";

describe("primaryFontFamily", () => {
	it("returns plain names", () => {
		expect(primaryFontFamily("Georgia")).toBe("Georgia");
		expect(primaryFontFamily("Open Sans")).toBe("Open Sans");
	});
	it("strips quotes", () => {
		expect(primaryFontFamily('"Open Sans"')).toBe("Open Sans");
		expect(primaryFontFamily("'Open Sans'")).toBe("Open Sans");
	});
	it("takes the first of a comma list", () => {
		expect(primaryFontFamily("Inter, system-ui")).toBe("Inter");
		expect(primaryFontFamily('"Open Sans", serif')).toBe("Open Sans");
	});
	it("trims whitespace", () => {
		expect(primaryFontFamily("  Inter  ,serif")).toBe("Inter");
		expect(primaryFontFamily("  Open   Sans ")).toBe("Open Sans");
	});
	it.each([
		"serif",
		"sans-serif",
		"monospace",
		"cursive",
		"fantasy",
		"system-ui",
		"math",
		"emoji",
		"fangsong",
		"inherit",
		"initial",
		"unset",
		"revert",
		"revert-layer",
		"SERIF",
	])("returns null for generic %s", (kw) => {
		expect(primaryFontFamily(kw)).toBeNull();
		expect(primaryFontFamily(`${kw}, Inter`)).toBeNull();
	});
	it("returns null for ui-* families", () => {
		expect(primaryFontFamily("ui-sans-serif")).toBeNull();
		expect(primaryFontFamily("ui-monospace, Inter")).toBeNull();
	});
	it("returns null for empty and undefined", () => {
		expect(primaryFontFamily("")).toBeNull();
		expect(primaryFontFamily("   ")).toBeNull();
		expect(primaryFontFamily('""')).toBeNull();
		expect(primaryFontFamily(undefined)).toBeNull();
	});
});
