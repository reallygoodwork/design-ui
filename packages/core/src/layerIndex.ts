import type { Layer } from "./types";

export type LayerIndex = {
	/** Layer by id. With duplicate ids the first in depth-first order wins. */
	byId: Map<string, Layer>;
	/** Parent id by layer id; `null` for root layers. */
	parentId: Map<string, string | null>;
	/** Nesting depth by layer id; root layers are 0. */
	depth: Map<string, number>;
	/** Layer ids in depth-first (document) order. */
	order: string[];
};

const cache = new WeakMap<Layer[], LayerIndex>();

/** Build (or fetch the memoised) index for a layers array. */
export const buildLayerIndex = (layers: Layer[]): LayerIndex => {
	const cached = cache.get(layers);
	if (cached) {
		return cached;
	}
	const index: LayerIndex = {
		byId: new Map(),
		parentId: new Map(),
		depth: new Map(),
		order: [],
	};
	const visit = (list: Layer[], parent: string | null, depth: number) => {
		for (const layer of list) {
			if (!index.byId.has(layer.id)) {
				index.byId.set(layer.id, layer);
				index.parentId.set(layer.id, parent);
				index.depth.set(layer.id, depth);
			}
			index.order.push(layer.id);
			if (layer.children) {
				visit(layer.children, layer.id, depth + 1);
			}
		}
	};
	visit(layers, null, 0);
	cache.set(layers, index);
	return index;
};

export const getLayer = (index: LayerIndex, id: string): Layer | null =>
	index.byId.get(id) ?? null;

/** True when `descendantId` is strictly nested somewhere inside `ancestorId`. */
export const isDescendant = (
	index: LayerIndex,
	descendantId: string,
	ancestorId: string
): boolean => {
	if (!index.byId.has(descendantId)) {
		return false;
	}
	let current = index.parentId.get(descendantId);
	while (current !== null && current !== undefined) {
		if (current === ancestorId) {
			return true;
		}
		current = index.parentId.get(current);
	}
	return false;
};

/** Every descendant id of the given layers (not the layers themselves). */
export const getDescendantIds = (
	index: LayerIndex,
	ids: string[]
): Set<string> => {
	const result = new Set<string>();
	const collect = (children: Layer[] | undefined) => {
		for (const child of children ?? []) {
			result.add(child.id);
			collect(child.children);
		}
	};
	for (const id of ids) {
		collect(index.byId.get(id)?.children);
	}
	return result;
};
