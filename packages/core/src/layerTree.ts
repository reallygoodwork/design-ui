import type { Layer, LayerNode } from "./types";

export type NodeMap = Record<string, LayerNode>;

/** The flat form of a layer tree. */
export type Tree = {
	nodes: NodeMap;
	rootIds: string[];
};

export const getNode = (nodes: NodeMap, id: string): LayerNode | undefined =>
	Object.hasOwn(nodes, id) ? nodes[id] : undefined;

/**
 * Memoised nested forms. A nested Layer is cached per node and reused while
 * its node and all its nested children are unchanged, so untouched subtrees
 * keep their identity across edits.
 */
const nodeCache = new WeakMap<LayerNode, { children: Layer[]; layer: Layer }>();
const treeCache = new WeakMap<
	NodeMap,
	{ rootIds: string[]; result: Layer[] }
>();

/** Add a layer and its subtree to `nodes` (mutates). Returns null if the id exists. */
const addSubtree = (
	nodes: NodeMap,
	layer: Layer,
	parentId: string | null
): string | null => {
	if (Object.hasOwn(nodes, layer.id)) {
		return null;
	}
	const { children, ...rest } = layer;
	const node: LayerNode = { ...rest, parentId };
	nodes[layer.id] = node;
	if (children) {
		const childIds: string[] = [];
		for (const child of children) {
			const id = addSubtree(nodes, child, layer.id);
			if (id !== null) {
				childIds.push(id);
			}
		}
		node.childIds = childIds;
	}
	return layer.id;
};

/**
 * Flatten a nested layer tree. Layers whose id already appeared are dropped.
 * `denormalize` of the result returns the input array itself (and its layers),
 * so passing a result back in is recognised as an echo.
 */
export const normalize = (layers: Layer[]): Tree => {
	const nodes: NodeMap = {};
	const rootIds: string[] = [];
	let total = 0;
	const count = (list: Layer[]) => {
		for (const l of list) {
			total++;
			if (l.children) {
				count(l.children);
			}
		}
	};
	count(layers);
	for (const layer of layers) {
		const id = addSubtree(nodes, layer, null);
		if (id !== null) {
			rootIds.push(id);
		}
	}
	// Seed the caches only when nothing was dropped
	if (Object.keys(nodes).length === total) {
		const seed = (list: Layer[]) => {
			for (const l of list) {
				nodeCache.set(nodes[l.id], { children: l.children ?? [], layer: l });
				if (l.children) {
					seed(l.children);
				}
			}
		};
		seed(layers);
		treeCache.set(nodes, { rootIds, result: layers });
	}
	return { nodes, rootIds };
};

const sameItems = (a: Layer[], b: Layer[]) =>
	a.length === b.length && a.every((item, i) => item === b[i]);

/** The nested layer for one node, or null if the id is unknown. */
export const denormalizeNode = (nodes: NodeMap, id: string): Layer | null => {
	const node = getNode(nodes, id);
	if (!node) {
		return null;
	}
	const children: Layer[] = [];
	for (const childId of node.childIds ?? []) {
		const child = denormalizeNode(nodes, childId);
		if (child) {
			children.push(child);
		}
	}
	const cached = nodeCache.get(node);
	if (cached && sameItems(cached.children, children)) {
		return cached.layer;
	}
	const { parentId: _parentId, childIds, ...rest } = node;
	const layer: Layer = childIds ? { ...rest, children } : rest;
	nodeCache.set(node, { children, layer });
	return layer;
};

/** The nested layer tree. Same reference while `nodes` and `rootIds` are unchanged. */
export const denormalize = (nodes: NodeMap, rootIds: string[]): Layer[] => {
	const cached = treeCache.get(nodes);
	if (cached && cached.rootIds === rootIds) {
		return cached.result;
	}
	const roots: Layer[] = [];
	for (const id of rootIds) {
		const layer = denormalizeNode(nodes, id);
		if (layer) {
			roots.push(layer);
		}
	}
	const result =
		cached && sameItems(cached.result, roots) ? cached.result : roots;
	treeCache.set(nodes, { rootIds, result });
	return result;
};

// ---- id-based edits: each returns the same tree object when nothing changed ----

/** Replace one node. Every other node and `rootIds` keep their identity. */
export const updateNode = (
	tree: Tree,
	id: string,
	updater: (node: LayerNode) => LayerNode
): Tree => {
	const node = getNode(tree.nodes, id);
	if (!node) {
		return tree;
	}
	const next = updater(node);
	if (next === node) {
		return tree;
	}
	return { nodes: { ...tree.nodes, [id]: next }, rootIds: tree.rootIds };
};

type Position = "before" | "inside" | "after";

// Remove `id` from its parent's child list (mutates `nodes`). Returns the new rootIds.
const detach = (nodes: NodeMap, rootIds: string[], id: string): string[] => {
	const { parentId } = nodes[id];
	if (parentId === null) {
		return rootIds.filter((r) => r !== id);
	}
	const parent = nodes[parentId];
	nodes[parentId] = {
		...parent,
		childIds: (parent.childIds ?? []).filter((c) => c !== id),
	};
	return rootIds;
};

// Link `id` (already in `nodes`, detached) relative to the target (mutates `nodes`).
// A missing target appends to the root. Returns the new rootIds.
const attach = (
	nodes: NodeMap,
	rootIds: string[],
	id: string,
	targetId: string | null,
	position: Position
): string[] => {
	const target = targetId === null ? undefined : getNode(nodes, targetId);
	let parentId: string | null = null;
	let nextRootIds = rootIds;
	if (!(target && targetId)) {
		nextRootIds = [...rootIds, id];
	} else if (position === "inside") {
		parentId = targetId;
		nodes[targetId] = { ...target, childIds: [...(target.childIds ?? []), id] };
	} else {
		parentId = target.parentId;
		const list =
			parentId === null ? [...rootIds] : [...(nodes[parentId].childIds ?? [])];
		const at = list.indexOf(targetId) + (position === "after" ? 1 : 0);
		list.splice(at, 0, id);
		if (parentId === null) {
			nextRootIds = list;
		} else {
			nodes[parentId] = { ...nodes[parentId], childIds: list };
		}
	}
	const node = nodes[id];
	if (node.parentId !== parentId) {
		nodes[id] = { ...node, parentId };
	}
	return nextRootIds;
};

/** Insert a new layer (with its subtree) relative to a target; a missing target appends to the root. */
export const insertLayer = (
	tree: Tree,
	layer: Layer,
	targetId: string,
	position: Position
): Tree => {
	const nodes = { ...tree.nodes };
	const id = addSubtree(nodes, layer, null);
	if (id === null) {
		return tree;
	}
	const rootIds = attach(nodes, tree.rootIds, id, targetId, position);
	return { nodes, rootIds };
};

/** Delete a layer and its descendants. */
export const removeLayer = (tree: Tree, id: string): Tree => {
	if (!getNode(tree.nodes, id)) {
		return tree;
	}
	const nodes = { ...tree.nodes };
	const rootIds = detach(nodes, tree.rootIds, id);
	const drop = (dropId: string) => {
		const node = nodes[dropId];
		delete nodes[dropId];
		for (const c of node?.childIds ?? []) {
			drop(c);
		}
	};
	drop(id);
	return { nodes, rootIds };
};

const isInside = (nodes: NodeMap, id: string, ancestorId: string): boolean => {
	let current = getNode(nodes, id)?.parentId;
	while (current !== null && current !== undefined) {
		if (current === ancestorId) {
			return true;
		}
		current = nodes[current]?.parentId;
	}
	return false;
};

/**
 * Move a layer (with its subtree) relative to a target. A target that is
 * missing, or inside the moved layer, puts it at the end of the root.
 */
export const moveLayer = (
	tree: Tree,
	id: string,
	targetId: string,
	position: Position
): Tree => {
	if (!getNode(tree.nodes, id) || id === targetId) {
		return tree;
	}
	const nodes = { ...tree.nodes };
	const unreachable = isInside(nodes, targetId, id);
	const detached = detach(nodes, tree.rootIds, id);
	const rootIds = attach(
		nodes,
		detached,
		id,
		unreachable ? null : targetId,
		position
	);
	return { nodes, rootIds };
};

/** Apply `updater` to every node; nodes it returns unchanged keep their identity. */
export const mapNodes = (
	tree: Tree,
	updater: (node: LayerNode) => LayerNode
): Tree => {
	let nodes: NodeMap | null = null;
	for (const [id, node] of Object.entries(tree.nodes)) {
		const next = updater(node);
		if (next !== node) {
			nodes ??= { ...tree.nodes };
			nodes[id] = next;
		}
	}
	return nodes ? { nodes, rootIds: tree.rootIds } : tree;
};
