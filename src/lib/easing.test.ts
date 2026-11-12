import { describe, expect, it } from "vitest";
import {
	DEFAULT_TRANSITIONS,
	parseBezier,
	readTransition,
	sampleSpring,
	settleTime,
	springAt,
	springParams,
	toLinearEasing,
	transitionToCss,
} from "./easing";

const bouncy = { stiffness: 170, damping: 8, mass: 1 };
const critical = { stiffness: 100, damping: 20, mass: 1 };
const overdamped = { stiffness: 100, damping: 40, mass: 1 };

describe("springs", () => {
	it.each([
		["underdamped", bouncy],
		["critically damped", critical],
		["overdamped", overdamped],
	])("%s starts at 0 and settles at 1", (_, params) => {
		expect(springAt(params, 0)).toBeCloseTo(0, 6);
		expect(springAt(params, settleTime(params))).toBeCloseTo(1, 2);
	});

	it("only overshoots when underdamped", () => {
		const peak = (params: typeof bouncy) =>
			Math.max(...sampleSpring(params).map((p) => p.x));
		expect(peak(bouncy)).toBeGreaterThan(1.1);
		expect(peak(critical)).toBeLessThanOrEqual(1.0001);
		expect(peak(overdamped)).toBeLessThanOrEqual(1.0001);
	});

	it("turns zero bounce into a critically damped spring", () => {
		const params = springParams({
			type: "time",
			visualDuration: 0.5,
			bounce: 0,
		});
		expect(params.damping).toBeCloseTo(2 * Math.sqrt(params.stiffness), 6);
	});

	it("caps very slow springs", () => {
		expect(
			settleTime({ stiffness: 1, damping: 1, mass: 10 })
		).toBeLessThanOrEqual(10);
	});
});

describe("CSS output", () => {
	it("writes a bezier", () => {
		expect(transitionToCss(DEFAULT_TRANSITIONS.easing)).toEqual({
			duration: "0.3s",
			timingFunction: "cubic-bezier(0.25, 0.1, 0.25, 1)",
		});
	});

	it("writes springs as a compact linear() from 0 to 1", () => {
		const { timingFunction } = transitionToCss(DEFAULT_TRANSITIONS.time);
		expect(timingFunction).toMatch(/^linear\(0, .*, 1\)$/);
		expect(timingFunction.split(",").length).toBeLessThan(60);
	});

	it("keeps endpoints when simplifying a straight line", () => {
		expect(
			toLinearEasing([
				{ t: 0, x: 0 },
				{ t: 0.5, x: 0.5 },
				{ t: 1, x: 1 },
			])
		).toBe("linear(0, 1)");
	});
});

describe("reading stored values", () => {
	it("parses and clamps bezier text", () => {
		expect(parseBezier("0.2, 3, 2, -4")).toEqual([0.2, 2, 1, -1]);
		expect(parseBezier("0.2, 3")).toBeNull();
	});

	it("prefers the saved config", () => {
		const config = DEFAULT_TRANSITIONS.physics;
		expect(
			readTransition(JSON.stringify(config), "1s", "linear(0, 1)")
		).toEqual(config);
	});

	it("reads hand-written CSS", () => {
		expect(
			readTransition(undefined, "0.4s", "cubic-bezier(0, 0, 0.5, 1)")
		).toEqual({ type: "easing", duration: 0.4, ease: [0, 0, 0.5, 1] });
	});

	it("is empty when nothing is set", () => {
		expect(readTransition(undefined, undefined, undefined)).toBeNull();
	});
});
