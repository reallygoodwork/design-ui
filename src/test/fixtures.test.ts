import { describe, expect, it } from "vitest";
import { initialState, reducer } from "../hooks/useDesigner";
import { makeLayer } from "./fixtures";

describe("test infrastructure", () => {
	it("runs the reducer against fixture layers", () => {
		const state = reducer(
			{ ...initialState, layers: [makeLayer("A")] },
			{ type: "DESELECT_ALL" }
		);
		expect(state.layers.map((l) => l.id)).toEqual(["A"]);
	});
});
