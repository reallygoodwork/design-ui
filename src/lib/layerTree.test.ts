import { describe, expect, it } from "vitest";
import { initialState, reducer, type State } from "../hooks/useDesigner";
import { makeLayer } from "../test/fixtures";
import {
	denormalize,
	denormalizeNode,
	moveLayer,
	normalize,
	removeLayer,
	type Tree,
} from "./layerTree";
import type { Layer } from "./Types";

// Small seeded PRNG (mulberry32)
const rng = (seed: number) => {
	let a = seed;
	return () => {
		a = (a + 0x6d_2b_79_f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
	};
};

const randomTree = (seed: number): Layer[] => {
	const rand = rng(seed);
	let n = 0;
	const make = (depth: number): Layer => {
		const id = `n${n++}`;
		const extra: Partial<Layer> = {};
		if (rand() < 0.4) extra.cssVars = { color: `c${n}` };
		if (rand() < 0.2) extra.breakpointCssVars = { tablet: { width: "1px" } };
		if (rand() < 0.1) extra.isLocked = true;
		let children: Layer[] | undefined;
		const r = rand();
		if (depth < 4 && r < 0.5) {
			children = Array.from({ length: Math.floor(rand() * 4) }, () =>
				make(depth + 1)
			);
		}
		return makeLayer(id, children, extra);
	};
	return Array.from({ length: Math.floor(rand() * 6) }, () => make(0));
};

const clone = <T>(v: T): T => structuredClone(v);

describe("normalize / denormalize", () => {
	it("round-trips 200 seeded random trees (deep equal)", () => {
		for (let seed = 1; seed <= 200; seed++) {
			const tree = randomTree(seed);
			const copy = clone(tree);
			const { nodes, rootIds } = normalize(copy);
			// Rebuild from a fresh, unseeded copy of the nodes
			const fresh = { ...nodes };
			expect(denormalize(fresh, rootIds)).toEqual(tree);
			expect(denormalize(nodes, rootIds)).toEqual(tree);
		}
	});

	it("keeps empty children arrays and leaves without children distinct", () => {
		const tree = [makeLayer("a", []), makeLayer("b")];
		const { nodes, rootIds } = normalize(clone(tree));
		const out = denormalize({ ...nodes }, rootIds);
		expect(out).toEqual(tree);
		expect(out[0].children).toEqual([]);
		expect("children" in out[1]).toBe(false);
	});

	it("flat nodes hold childIds and parentId, not children", () => {
		const { nodes, rootIds } = normalize([
			makeLayer("A", [makeLayer("a1")]),
			makeLayer("B"),
		]);
		expect(rootIds).toEqual(["A", "B"]);
		expect(nodes.A.childIds).toEqual(["a1"]);
		expect(nodes.a1.parentId).toBe("A");
		expect(nodes.A.parentId).toBeNull();
		expect("children" in nodes.A).toBe(false);
	});

	it("is memoised: same reference for unchanged input", () => {
		for (let seed = 1; seed <= 20; seed++) {
			const { nodes, rootIds } = normalize(clone(randomTree(seed)));
			const unseeded = { ...nodes };
			const first = denormalize(unseeded, rootIds);
			expect(denormalize(unseeded, rootIds)).toBe(first);
		}
	});

	it("returns the input array for a freshly normalised tree", () => {
		const input = randomTree(7);
		const { nodes, rootIds } = normalize(input);
		expect(denormalize(nodes, rootIds)).toBe(input);
	});

	it("keeps untouched subtrees === across an edit", () => {
		const tree = normalize([
			makeLayer("A", [makeLayer("a1"), makeLayer("a2")]),
			makeLayer("B", [makeLayer("b1")]),
		]);
		const before = denormalize(tree.nodes, tree.rootIds);
		const nodes = {
			...tree.nodes,
			a1: { ...tree.nodes.a1, name: "renamed" },
		};
		const after = denormalize(nodes, tree.rootIds);
		expect(after).not.toBe(before);
		expect(after[0]).not.toBe(before[0]);
		expect(after[0].children?.[0].name).toBe("renamed");
		expect(after[0].children?.[1]).toBe(before[0].children?.[1]);
		expect(after[1]).toBe(before[1]);
		expect(denormalizeNode(nodes, "b1")).toBe(before[1].children?.[0]);
	});

	it("moves and removes by id", () => {
		const tree = normalize([
			makeLayer("A", [makeLayer("a1")]),
			makeLayer("B"),
			makeLayer("M"),
		]);
		const moved = moveLayer(tree, "M", "a1", "before");
		expect(denormalize(moved.nodes, moved.rootIds).map((l) => l.id)).toEqual([
			"A",
			"B",
		]);
		expect(moved.nodes.A.childIds).toEqual(["M", "a1"]);
		expect(moved.nodes.M.parentId).toBe("A");
		const removed = removeLayer(moved, "A");
		expect(Object.keys(removed.nodes).sort()).toEqual(["B"]);
		expect(removed.rootIds).toEqual(["B"]);
	});
});

const expectOnlyEdited = (
	next: State,
	before: Tree,
	ids: string[],
	x: string
) => {
	expect(next.rootIds).toBe(before.rootIds);
	expect(next.nodes[x]).not.toBe(before.nodes[x]);
	for (const id of ids.filter((i) => i !== x)) {
		expect(next.nodes[id]).toBe(before.nodes[id]);
	}
};

describe("node identity", () => {
	it("editing X leaves every other node object and rootIds ===", () => {
		for (let seed = 1; seed <= 30; seed++) {
			const tree = normalize(clone(randomTree(seed)));
			const ids = Object.keys(tree.nodes);
			if (ids.length === 0) continue;
			const state = { ...initialState, ...tree };
			const x = ids[seed % ids.length];
			expectOnlyEdited(
				reducer(state, {
					type: "UPDATE_LAYER_NAME",
					payload: { layerId: x, name: "edited" },
				}),
				tree,
				ids,
				x
			);
			expectOnlyEdited(
				reducer(state, {
					type: "UPDATE_LAYER_CSS",
					payload: { id: x, css: { color: "red" } },
				}),
				tree,
				ids,
				x
			);
		}
	});
});
