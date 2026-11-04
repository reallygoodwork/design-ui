import { describe, expect, it } from "vitest";
import type { Layer } from "../lib/Types";
import { makeLayer } from "../test/fixtures";
import { initialState, reducer } from "./useDesigner";

const flatIds = (layers: Layer[]): string[] =>
	layers.flatMap((l) => [l.id, ...flatIds(l.children ?? [])]);

describe("insertLayer", () => {
	it("ADD_LAYER inside A adds the layer only once", () => {
		const state = {
			...initialState,
			layers: [
				makeLayer("A", [makeLayer("a1")]),
				makeLayer("B", [makeLayer("b1")]),
			],
		};
		const next = reducer(state, {
			type: "ADD_LAYER",
			payload: {
				layer: makeLayer("NEW"),
				targetLayerId: "A",
				position: "inside",
			},
		});
		expect(flatIds(next.layers)).toEqual(["A", "a1", "NEW", "B", "b1"]);
	});

	it("ADD_LAYER inside a deeply nested frame inserts only there", () => {
		const state = {
			...initialState,
			layers: [
				makeLayer("A", [makeLayer("a1", [makeLayer("a2")])]),
				makeLayer("B", [makeLayer("b1")]),
			],
		};
		const next = reducer(state, {
			type: "ADD_LAYER",
			payload: {
				layer: makeLayer("NEW"),
				targetLayerId: "a2",
				position: "inside",
			},
		});
		expect(flatIds(next.layers)).toEqual(["A", "a1", "a2", "NEW", "B", "b1"]);
	});

	it("MOVE_LAYER on A leaves exactly one copy of the moved layer", () => {
		const state = {
			...initialState,
			layers: [
				makeLayer("A", [makeLayer("a1")]),
				makeLayer("B", [makeLayer("b1")]),
				makeLayer("M"),
			],
		};
		const next = reducer(state, {
			type: "MOVE_LAYER",
			payload: { layerIds: ["M"], targetId: "A", position: "on" },
		});
		expect(flatIds(next.layers)).toEqual(["A", "a1", "M", "B", "b1"]);
	});
});
