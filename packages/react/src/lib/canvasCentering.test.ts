import { describe, expect, it } from "vitest";
import { centeredScroll, shouldRecenter } from "./canvasCentering";

const artboards = { x: 0, y: 0, width: 1000, height: 500 };
const view = (x: number, y: number, width = 1000, height = 500) => ({
	x,
	y,
	width,
	height,
});

describe("shouldRecenter", () => {
	it("leaves fully visible artboards alone", () => {
		expect(shouldRecenter(view(0, 0), artboards)).toBe(false);
	});

	it("leaves them alone when half or more is still visible", () => {
		expect(shouldRecenter(view(500, 0), artboards)).toBe(false);
	});

	it("recenters when less than half is visible", () => {
		expect(shouldRecenter(view(600, 0), artboards)).toBe(true);
	});

	it("recenters when they're completely off screen", () => {
		expect(shouldRecenter(view(5000, 5000), artboards)).toBe(true);
	});

	it("counts overlap on both axes", () => {
		// 70% across times 70% down = 49% visible
		expect(shouldRecenter(view(300, 150), artboards)).toBe(true);
	});

	it("leaves zoomed-in views alone while the artboards fill the screen", () => {
		// Only 4% of the artboards shows, but they fill the whole view.
		expect(shouldRecenter(view(100, 100, 200, 100), artboards)).toBe(false);
	});

	it("recenters a zoomed-in view that has wandered off them", () => {
		// Half the view's width hangs past the right edge: 25% of the view
		// is artboard, and a tiny share of the artboards shows.
		expect(shouldRecenter(view(950, 100, 200, 100), artboards)).toBe(true);
	});

	it("never recenters with no artboards", () => {
		expect(
			shouldRecenter(view(0, 0), { x: 0, y: 0, width: 0, height: 0 })
		).toBe(false);
	});
});

describe("centeredScroll", () => {
	it("puts the artboards' middle at the view's middle", () => {
		expect(centeredScroll(artboards, { width: 2000, height: 1000 })).toEqual({
			x: -500,
			y: -250,
		});
	});
});
