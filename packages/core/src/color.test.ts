import { describe, expect, it } from "vitest";
import {
	detectFormat,
	formatColor,
	hsvaToString,
	isValidColor,
	parseToHsva,
} from "./color";

describe("color", () => {
	it("detects the format a color is written in", () => {
		expect(detectFormat("#ff0000")).toBe("hex");
		expect(detectFormat("oklch(0.7 0.2 145)")).toBe("oklch");
		expect(detectFormat("color(display-p3 1 0 0)")).toBe("p3");
		expect(detectFormat("rgb(1 2 3)")).toBeNull();
	});

	it("converts between hex, OKLCH and P3", () => {
		expect(formatColor("#ffffff", "oklch")).toBe("oklch(1 0 0)");
		expect(formatColor("#ff0000", "oklch")).toBe("oklch(0.628 0.2577 29.23)");
		expect(formatColor("oklch(1 0 0)", "hex")).toBe("#ffffff");
		expect(formatColor("#ffffff", "p3")).toBe("color(display-p3 1 1 1)");
	});

	it("reads rgb, hsl and named colors", () => {
		expect(formatColor("rgb(255 0 0)", "hex")).toBe("#ff0000");
		expect(formatColor("hsl(0 100% 50%)", "hex")).toBe("#ff0000");
		expect(formatColor("red", "hex")).toBe("#ff0000");
	});

	it("keeps opacity in every format", () => {
		expect(formatColor("#ff000080", "oklch")).toMatch(/ \/ 0\.502\)$/);
		expect(formatColor("oklch(1 0 0 / 0.5)", "hex")).toBe("#ffffff80");
		expect(formatColor("oklch(1 0 0 / 0.5)", "p3")).toMatch(/ \/ 0\.5\)$/);
	});

	it("rejects text that isn't a color", () => {
		expect(isValidColor("nope")).toBe(false);
		expect(formatColor("nope", "hex")).toBeNull();
	});

	it("round-trips through the picker's axes", () => {
		const hsva = parseToHsva("#7c3aed");
		expect(hsva).not.toBeNull();
		if (hsva) expect(hsvaToString(hsva, "hex")).toBe("#7c3aed");
	});

	it("uses OKLCH hue on the picker", () => {
		expect(parseToHsva("oklch(0.7 0.15 145)")?.h).toBeCloseTo(145, 0);
	});
});
