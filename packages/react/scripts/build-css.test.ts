// @vitest-environment node
import postcss from "postcss";
import { describe, expect, it } from "vitest";
import { scope, scopeSelector } from "./build-css";

describe("scoping the built stylesheet to the editor", () => {
	it("matches inside the editor's root, and the root itself", () => {
		expect(scopeSelector(".p-2")).toEqual([".ds .p-2", ".p-2.ds"]);
		expect(scopeSelector("button")).toEqual([".ds button", "button.ds"]);
		expect(scopeSelector(".group:hover .x")).toEqual([
			".ds .group:hover .x",
			".group:hover .x.ds",
		]);
	});

	it("puts the root before a pseudo-element, skipping escaped colons", () => {
		expect(scopeSelector(".file\\:h-7::file-selector-button")).toEqual([
			".ds .file\\:h-7::file-selector-button",
			".file\\:h-7.ds::file-selector-button",
		]);
		expect(scopeSelector("::before")).toEqual([".ds ::before", ".ds::before"]);
	});

	it("moves page-level rules and dark mode onto the root", () => {
		expect(scopeSelector(":root")).toEqual([".ds"]);
		expect(scopeSelector("body")).toEqual([".ds"]);
		expect(scopeSelector(".dark")).toEqual([".dark .ds", ".ds.dark"]);
		expect(scopeSelector(".ds")).toEqual([".ds"]);
	});

	it("takes rules out of cascade layers and leaves keyframes alone", () => {
		const out = scope(
			postcss.parse(
				"@layer utilities{.p-2{padding:8px}}@keyframes spin{to{rotate:1turn}}"
			)
		).toString();
		expect(out).not.toContain("@layer");
		expect(out).toContain(".ds .p-2,.p-2.ds{padding:8px}");
		expect(out).toContain("@keyframes spin{to{rotate:1turn}}");
	});
});
