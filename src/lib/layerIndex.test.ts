import { describe, expect, it } from "vitest";
import {
	buildLayerIndex,
	getDescendantIds,
	getLayer,
	isDescendant,
} from "./layerIndex";
import type { Layer } from "./Types";

// mulberry32: small seeded PRNG so the trees are deterministic
const seeded = (seed: number) => {
	let a = seed;
	return () => {
		a = (a + 0x6d_2b_79_f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
	};
};

const randomTree = (rand: () => number): Layer[] => {
	let n = 0;
	const make = (depth: number): Layer[] => {
		const count = Math.floor(rand() * (depth === 0 ? 5 : 4));
		const list: Layer[] = [];
		for (let i = 0; i < count; i++) {
			n += 1;
			const layer: Layer = {
				id: `l${n}`,
				name: `l${n}`,
				type: "frame",
				value: "",
			};
			if (depth < 4 && rand() < 0.6) {
				layer.children = make(depth + 1);
			}
			list.push(layer);
		}
		return list;
	};
	return make(0);
};

// Reference recursive implementations
const refFind = (layers: Layer[], id: string): Layer | null => {
	for (const layer of layers) {
		if (layer.id === id) {
			return layer;
		}
		const found = layer.children ? refFind(layer.children, id) : null;
		if (found) {
			return found;
		}
	}
	return null;
};

const refIsDescendant = (layers: Layer[], d: string, a: string): boolean => {
	const ancestor = refFind(layers, a);
	if (!ancestor?.children) {
		return false;
	}
	for (const child of ancestor.children) {
		if (child.id === d || refIsDescendant([child], d, child.id)) {
			return true;
		}
	}
	return false;
};

const refDescendantIds = (layers: Layer[], ids: string[]): Set<string> => {
	const out = new Set<string>();
	const collect = (children?: Layer[]) => {
		for (const c of children ?? []) {
			out.add(c.id);
			collect(c.children);
		}
	};
	for (const id of ids) {
		collect(refFind(layers, id)?.children);
	}
	return out;
};

const refParentAndDepth = (
	layers: Layer[],
	id: string,
	parent: string | null = null,
	depth = 0
): { parent: string | null; depth: number } | null => {
	for (const layer of layers) {
		if (layer.id === id) {
			return { parent, depth };
		}
		const found = layer.children
			? refParentAndDepth(layer.children, id, layer.id, depth + 1)
			: null;
		if (found) {
			return found;
		}
	}
	return null;
};

const expectLookups = (tree: Layer[], ids: string[]) => {
	const index = buildLayerIndex(tree);
	for (const id of ids) {
		expect(getLayer(index, id)).toBe(refFind(tree, id));
		const ref = refParentAndDepth(tree, id);
		expect(index.parentId.get(id) ?? null).toBe(ref ? ref.parent : null);
		expect(index.depth.get(id)).toBe(ref?.depth);
	}
	for (const a of ids) {
		for (const b of ids) {
			expect(isDescendant(index, a, b)).toBe(refIsDescendant(tree, a, b));
		}
	}
};

describe("layerIndex", () => {
	it("matches the recursive reference on 200 random trees", () => {
		const rand = seeded(12_345);
		for (let t = 0; t < 200; t++) {
			const tree = randomTree(rand);
			const index = buildLayerIndex(tree);
			const ids = [...index.order, "missing"];
			expect(index.order.length).toBe(ids.length - 1);
			expectLookups(tree, ids);
			const sample = ids.filter(() => rand() < 0.3);
			expect(getDescendantIds(index, sample)).toEqual(
				refDescendantIds(tree, sample)
			);
		}
	});

	it("memoises per layers array", () => {
		const tree = randomTree(seeded(1));
		expect(buildLayerIndex(tree)).toBe(buildLayerIndex(tree));
		expect(buildLayerIndex([...tree])).not.toBe(buildLayerIndex(tree));
	});
});
