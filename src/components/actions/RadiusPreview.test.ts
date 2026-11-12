import { describe, expect, it } from "vitest";
import { previewRadii } from "./RadiusPreview";

describe("previewRadii", () => {
	it("keeps radii that fit", () => {
		expect(previewRadii(["20px", "24px", "8px", "0px"])).toEqual([
			20, 24, 8, 0,
		]);
	});

	it("treats unset corners as square", () => {
		expect(previewRadii([undefined, "10px", undefined, undefined])).toEqual([
			0, 10, 0, 0,
		]);
	});

	it("shrinks overlapping radii as CSS does", () => {
		const [tl, , bl] = previewRadii(["88px", "0px", "88px", "0px"]);
		expect(tl).toBe(44);
		expect(bl).toBe(44);
	});

	it("converts rem and percent", () => {
		expect(previewRadii(["1rem", "50%", "0px", "0px"])).toEqual([16, 44, 0, 0]);
	});
});
