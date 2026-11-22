import { describe, expect, it } from "vitest";
import { suggestionFor } from "./suggest";

describe("suggestionFor", () => {
	it.each([
		["--padding-block-start", "Spacing", "size.space.6", "font.size.body"],
		["--row-gap", "Spacing", "space.stack", "size.radius.lg"],
		[
			"--margin-inline-start,--margin-inline-end",
			"Spacing",
			"spacing.4",
			"font.size.body",
		],
		["--border-top-left-radius", "Radius", "size.radius.lg", "size.space.6"],
		["--font-size", "Font sizes", "font.size.display", "size.space.6"],
		["--width", "Sizes", "container.width.md", "size.space.6"],
	])("%s suggests %s", (property, label, yes, no) => {
		const s = suggestionFor(property);
		expect(s?.label).toBe(label);
		expect(s?.matches(yes)).toBe(true);
		expect(s?.matches(no)).toBe(false);
	});

	it("has nothing to say about colors", () => {
		expect(suggestionFor("--background-color")).toBeNull();
	});
});
