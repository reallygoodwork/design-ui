import { act, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { textLayerType } from "../lib/layers/text";
import type { Layer } from "../lib/Types";
import {
	breakpoints,
	defaultLayerTypes,
	makeLayer,
	renderInDesigner,
} from "../test/fixtures";
import {
	type Action,
	getCoalesceKey,
	initialState,
	reducer,
	type State,
} from "./useDesigner";
import { useDesignerContext } from "./useDesignerContext";
import { useHistory } from "./useHistory";

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

const layerName = (state: State, id: string) =>
	findById(state.layers, id)?.name;

const findById = (layers: Layer[], id: string): Layer | undefined => {
	for (const l of layers) {
		if (l.id === id) return l;
		const f = findById(l.children ?? [], id);
		if (f) return f;
	}
	return undefined;
};

const run = (state: State, ...actions: Action[]) =>
	actions.reduce(reducer, state);

const rename = (layerId: string, name: string): Action => ({
	type: "UPDATE_LAYER_NAME",
	payload: { layerId, name },
});

const base = (): State => ({
	...initialState,
	layers: [makeLayer("X"), makeLayer("Y"), makeLayer("Z")],
	breakpoints,
	activeBreakpointId: "mobile",
});

let seen = { canUndo: false, canRedo: false };
const Probe = () => {
	const { dispatch } = useDesignerContext();
	seen = useHistory();
	return createElement(
		"button",
		{ type: "button", onClick: () => dispatch(rename("X", "n")) },
		"go"
	);
};

describe("undo redo", () => {
	it("rename -> UNDO -> REDO gives the renamed value", () => {
		const s = run(base(), rename("X", "renamed"), { type: "UNDO" });
		expect(layerName(s, "X")).toBe("X");
		expect(layerName(reducer(s, { type: "REDO" }), "X")).toBe("renamed");
	});

	it("edit A, edit B, UNDO x2, REDO x2 returns to post-B document", () => {
		const afterB = run(base(), rename("X", "A"), {
			type: "UPDATE_LAYER_LOCK",
			payload: { layerId: "Y", isLocked: true },
		});
		const s = run(
			afterB,
			{ type: "UNDO" },
			{ type: "UNDO" },
			{ type: "REDO" },
			{ type: "REDO" }
		);
		expect(s.layers).toEqual(afterB.layers);
	});

	it("a new edit after an undo clears redo", () => {
		const s = run(base(), rename("X", "a"), { type: "UNDO" });
		expect(s.history.future.length).toBe(1);
		const next = reducer(s, {
			type: "UPDATE_LAYER_LOCK",
			payload: { layerId: "Y", isLocked: true },
		});
		expect(next.history.future).toEqual([]);
	});

	it("useHistory().canUndo is true after one edit", () => {
		renderInDesigner(createElement(Probe), { layers: [makeLayer("X")] });
		expect(seen.canUndo).toBe(false);
		act(() => screen.getByText("go").click());
		expect(seen.canUndo).toBe(true);
		expect(seen.canRedo).toBe(false);
	});
});

describe("history scope", () => {
	it("UNDO/REDO leave zoom, pan, dialog and centerRequestId alone", () => {
		const s = run(
			base(),
			rename("X", "r"),
			{ type: "SET_ZOOM", payload: 3 },
			{ type: "SET_PAN", payload: { x: 5, y: 6 } },
			{
				type: "OPEN_ADD_LAYER_DIALOG",
				payload: { layerId: "X", position: "after" },
			},
			{ type: "CENTER_ON_BREAKPOINTS" }
		);
		for (const a of ["UNDO", "REDO"] as const) {
			const n = reducer(s, { type: a });
			expect(n.zoom).toBe(3);
			expect(n.pan).toEqual({ x: 5, y: 6 });
			expect(n.addLayerDialog).toEqual(s.addLayerDialog);
			expect(n.centerRequestId).toBe(1);
		}
		expect(layerName(reducer(s, { type: "UNDO" }), "X")).toBe("X");
	});

	it("undoing an ADD of a selected layer prunes it from selectedLayers", () => {
		const s = run(
			base(),
			{
				type: "ADD_LAYER",
				payload: {
					layer: makeLayer("NEW"),
					targetLayerId: "X",
					position: "after",
				},
			},
			{
				type: "SELECT_LAYER",
				payload: { layerId: "NEW", shiftKey: false },
			},
			{ type: "UNDO" }
		);
		expect(s.selectedLayers).not.toContain("NEW");
	});

	it("undoing ADD_BREAKPOINT resets selected/active breakpoint", () => {
		const bp = { ...breakpoints[0], id: "extra" };
		const s = run(
			base(),
			{ type: "ADD_BREAKPOINT", payload: { breakpoint: bp } },
			{ type: "SELECT_BREAKPOINT", payload: { breakpointId: "extra" } },
			{ type: "UNDO" }
		);
		expect(s.selectedBreakpointId).toBeNull();
		expect(s.breakpoints.some((b) => b.id === s.activeBreakpointId)).toBe(true);
	});
});

describe("history memory", () => {
	it("1000 renames keep past <= 200 and Docs hold no history", () => {
		let s = base();
		for (let i = 0; i < 1000; i++) {
			s = reducer(s, rename("X", `n${i}`));
			s = reducer(s, { type: "SET_ZOOM", payload: 1 + (i % 2) });
		}
		expect(s.history.past.length).toBeLessThanOrEqual(200);
		for (const doc of s.history.past) {
			expect(doc).not.toHaveProperty("history");
			expect(Object.keys(doc).sort()).toEqual([
				"breakpoints",
				"frameStyles",
				"layers",
			]);
		}
	});
});

describe("coalesce", () => {
	it("5 name updates for one layer make 1 undo step", () => {
		let s = base();
		for (const n of ["h", "he", "hel", "hell", "hello"]) {
			s = reducer(s, rename("X", n));
		}
		expect(s.history.past.length).toBe(1);
		expect(layerName(reducer(s, { type: "UNDO" }), "X")).toBe("X");
	});

	it("names of different layers do not coalesce", () => {
		const s = run(base(), rename("X", "a"), rename("Y", "b"));
		expect(s.history.past.length).toBe(2);
	});

	it("5 CSS updates of one prop coalesce; a different prop starts a new step", () => {
		const css = (v: string, prop = "width"): Action => ({
			type: "UPDATE_LAYER_CSS",
			payload: { id: "X", css: { [prop]: v } },
		});
		let s = base();
		for (let i = 1; i <= 5; i++) s = reducer(s, css(`${i}px`));
		expect(s.history.past.length).toBe(1);
		s = reducer(s, css("red", "color"));
		expect(s.history.past.length).toBe(2);
	});

	it("an intervening committing action breaks the run", () => {
		const s = run(
			base(),
			rename("X", "a"),
			{ type: "UPDATE_LAYER_LOCK", payload: { layerId: "Y", isLocked: true } },
			rename("X", "b")
		);
		expect(s.history.past.length).toBe(3);
	});

	it("echoing SET_LAYERS with the same array is a no-op that keeps the run", () => {
		let s = base();
		for (const n of ["a", "b", "c"]) {
			s = reducer(s, rename("X", n));
			const echoed = reducer(s, { type: "SET_LAYERS", payload: s.layers });
			expect(echoed).toBe(s);
			s = echoed;
		}
		expect(s.history.past.length).toBe(1);
	});

	it("SET_LAYERS with a different array still breaks the run", () => {
		let s = reducer(base(), rename("X", "a"));
		s = reducer(s, { type: "SET_LAYERS", payload: [...s.layers] });
		s = reducer(s, rename("X", "b"));
		expect(s.history.past.length).toBe(2);
	});

	it("getCoalesceKey is null for non-coalescing actions", () => {
		expect(getCoalesceKey({ type: "UNDO" }, null)).toBeNull();
		expect(getCoalesceKey(rename("X", "a"), null)).toBe("name:X");
	});
});

describe("delete", () => {
	it("DELETE_LAYERS of 3 layers is 1 step; UNDO restores them in order", () => {
		const s0 = {
			...base(),
			layers: [makeLayer("A"), makeLayer("B"), makeLayer("C"), makeLayer("D")],
		};
		const s = reducer(s0, {
			type: "DELETE_LAYERS",
			payload: { layerIds: ["A", "B", "C"] },
		});
		expect(flatIds(s.layers)).toEqual(["D"]);
		expect(s.history.past.length).toBe(1);
		expect(flatIds(reducer(s, { type: "UNDO" }).layers)).toEqual([
			"A",
			"B",
			"C",
			"D",
		]);
	});

	it("DELETE_LAYERS removes deleted ids from selectedLayers", () => {
		const s = reducer(
			{ ...base(), selectedLayers: ["X", "Y"] },
			{ type: "DELETE_LAYERS", payload: { layerIds: ["X"] } }
		);
		expect(s.selectedLayers).toEqual(["Y"]);
	});
});

describe("supportsChildren", () => {
	const base: State = {
		...initialState,
		layerTypes: defaultLayerTypes,
		layers: [
			makeLayer("T", undefined, { type: "text" }),
			makeLayer("F", []),
			makeLayer("X"),
		],
	};

	it("text layer type does not support children", () => {
		expect(textLayerType.supportsChildren).toBe(false);
	});

	it("ADD_LAYER inside a text layer returns the identical state", () => {
		const next = reducer(base, {
			type: "ADD_LAYER",
			payload: {
				layer: makeLayer("NEW"),
				targetLayerId: "T",
				position: "inside",
			},
		});
		expect(next).toBe(base);
		expect(next.history.past).toBe(base.history.past);
	});

	it("MOVE_LAYER on a text layer returns the identical state", () => {
		const next = reducer(base, {
			type: "MOVE_LAYER",
			payload: { layerIds: ["X"], targetId: "T", position: "on" },
		});
		expect(next).toBe(base);
	});

	it("ADD_LAYER inside a frame still works", () => {
		const next = reducer(base, {
			type: "ADD_LAYER",
			payload: {
				layer: makeLayer("NEW"),
				targetLayerId: "F",
				position: "inside",
			},
		});
		expect(flatIds(next.layers)).toEqual(["T", "F", "NEW", "X"]);
		expect(next.history.past.length).toBe(1);
	});
});

describe("breakpoint drag", () => {
	const move = (id: string, x: number): Action => ({
		type: "UPDATE_BREAKPOINT",
		payload: { id, updates: { position: { x, y: 0 } } },
	});
	const resize = (id: string, width: number): Action => ({
		type: "UPDATE_BREAKPOINT",
		payload: { id, updates: { width } },
	});
	const posOf = (s: State, id: string) =>
		s.breakpoints.find((b) => b.id === id)?.position;

	it("30 position updates for one breakpoint make 1 undo step; UNDO restores the original", () => {
		let s = base();
		const original = posOf(s, "tablet");
		for (let i = 1; i <= 30; i++) s = reducer(s, move("tablet", 425 + i));
		expect(s.history.past.length).toBe(1);
		expect(posOf(s, "tablet")).toEqual({ x: 455, y: 0 });
		expect(posOf(reducer(s, { type: "UNDO" }), "tablet")).toEqual(original);
	});

	it("a width update between moves starts a new step, and the next move another", () => {
		let s = run(base(), move("tablet", 1), move("tablet", 2));
		expect(s.history.past.length).toBe(1);
		s = reducer(s, resize("tablet", 800));
		expect(s.history.past.length).toBe(2);
		s = reducer(s, move("tablet", 3));
		expect(s.history.past.length).toBe(3);
	});

	it("position updates for two breakpoints in alternation do not merge", () => {
		const s = run(
			base(),
			move("tablet", 1),
			move("desktop", 1),
			move("tablet", 2),
			move("desktop", 2)
		);
		expect(s.history.past.length).toBe(4);
	});

	it("getCoalesceKey is null for non-position breakpoint updates", () => {
		expect(getCoalesceKey(resize("tablet", 800), null)).toBeNull();
		expect(
			getCoalesceKey(
				{
					type: "UPDATE_BREAKPOINT",
					payload: { id: "tablet", updates: { name: "T" } },
				},
				null
			)
		).toBeNull();
		expect(
			getCoalesceKey(
				{
					type: "UPDATE_BREAKPOINT",
					payload: {
						id: "tablet",
						updates: { width: 1, position: { x: 1, y: 1 } },
					},
				},
				null
			)
		).toBeNull();
		expect(getCoalesceKey(move("tablet", 1), null)).toBe("bp-pos:tablet");
	});
});
