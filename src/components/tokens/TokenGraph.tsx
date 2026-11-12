import "@xyflow/react/dist/style.css";
import { IconFocus2, IconMathFunction } from "@tabler/icons-react";
import {
	Background,
	Controls,
	type Edge,
	Handle,
	MarkerType,
	type Node,
	type NodeProps,
	Position,
	ReactFlow,
	ReactFlowProvider,
	useReactFlow,
} from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useLayers } from "../../hooks/useLayers";
import { modeAt, useTokens } from "../../hooks/useTokens";
import { cn } from "../../lib/cn";
import type { Layer } from "../../lib/Types";
import {
	aliasOf,
	indexTokens,
	isComposed,
	referencesOf,
	resolveToken,
	type Token,
	tokenFromCssValue,
} from "../../lib/tokens";
import { TokenGlyph } from "./TokenList";

type TokenNodeData = {
	kind: "token";
	token: Token;
	value?: string;
	broken: boolean;
	dim: boolean;
};
type LayerNodeData = {
	kind: "layer";
	layer: Layer;
	properties: string[];
	dim: boolean;
};
type GraphNode = Node<TokenNodeData, "token"> | Node<LayerNodeData, "layer">;

const COLUMN = 280;
const ROW = 40;
const LAYER_PREFIX = "layer:";
// Fit, but stay readable: a tall graph scrolls instead of shrinking away.
const FIT = { padding: 0.1, minZoom: 0.65, maxZoom: 1 };

const flatten = (layers: Layer[]): Layer[] =>
	layers.flatMap((layer) => [layer, ...flatten(layer.children ?? [])]);

const TokenNode = ({ data }: NodeProps<Node<TokenNodeData, "token">>) => (
	<div
		className={cn(
			"flex h-8 w-60 items-center gap-2 rounded-md border bg-background px-2 text-control shadow-xs transition-opacity duration-150",
			data.broken ? "border-destructive/60" : "border-border",
			data.dim && "opacity-25"
		)}
	>
		<Handle
			type="target"
			position={Position.Left}
			className="!size-1.5 !border-0 !bg-border-strong"
		/>
		<TokenGlyph type={data.token.type} value={data.value} />
		<span className="min-w-0 flex-1 truncate">{data.token.path}</span>
		{isComposed(data.token.value) && (
			<IconMathFunction
				aria-label="Composed"
				className="size-3.5 shrink-0 text-accent-text"
			/>
		)}
		<span className="max-w-20 shrink-0 truncate font-mono text-value text-muted-foreground">
			{data.value}
		</span>
		<Handle
			type="source"
			position={Position.Right}
			className="!size-1.5 !border-0 !bg-border-strong"
		/>
	</div>
);

const LayerNode = ({ data }: NodeProps<Node<LayerNodeData, "layer">>) => (
	<div
		className={cn(
			"flex h-8 w-60 items-center gap-2 rounded-md border border-dashed border-border-strong bg-muted px-2 text-control transition-opacity duration-150",
			data.dim && "opacity-25"
		)}
	>
		<Handle
			type="target"
			position={Position.Left}
			className="!size-1.5 !border-0 !bg-border-strong"
		/>
		<span className="font-medium">{data.layer.name}</span>
		<span className="min-w-0 flex-1 truncate text-caption text-muted-foreground">
			{data.properties.map((p) => p.slice(2)).join(", ")}
		</span>
	</div>
);

const nodeTypes = { token: TokenNode, layer: LayerNode };

/** Every token a token reads, in any mode. */
const readsOf = (token: Token) => [
	...new Set(
		[token.value, ...(token.modes ?? []).map((entry) => entry.value)].flatMap(
			referencesOf
		)
	),
];

const Graph = () => {
	const store = useTokens();
	const layers = useLayers();
	const dispatch = useDesignerAction();
	const { fitView } = useReactFlow();
	const [hovered, setHovered] = useState<string | null>(null);
	const [focus, setFocus] = useState<string | null>(null);
	const [showLayers, setShowLayers] = useState(true);

	const graph = useMemo(() => {
		const byPath = indexTokens(store.tokens);
		const mode = modeAt(store, store.breakpointOrder[0]);

		// Depth: how many steps from a raw value. Primitives on the left.
		const depth = new Map<string, number>();
		const depthOf = (path: string, seen: string[] = []): number => {
			if (depth.has(path)) return depth.get(path) as number;
			const token = byPath.get(path);
			if (!token || seen.includes(path)) return 0;
			const reads = readsOf(token).filter((ref) => byPath.has(ref));
			const d = reads.length
				? 1 + Math.max(...reads.map((ref) => depthOf(ref, [...seen, path])))
				: 0;
			depth.set(path, d);
			return d;
		};
		for (const token of store.tokens) depthOf(token.path);

		const edges: Edge[] = [];
		for (const token of store.tokens) {
			const defaults = new Set(referencesOf(token.value));
			for (const ref of readsOf(token)) {
				if (!byPath.has(ref)) continue;
				const composed = isComposed(token.value) && defaults.has(ref);
				const viaAlias = aliasOf(token.value) === ref;
				// A reference only some modes use is labelled with them.
				const modes = (token.modes ?? [])
					.filter((entry) => referencesOf(entry.value).includes(ref))
					.map((entry) => Object.values(entry.when).join(" · "));
				edges.push({
					id: `${ref}->${token.path}`,
					source: ref,
					target: token.path,
					label: composed
						? "fx"
						: !defaults.has(ref)
							? modes.join(", ")
							: undefined,
					animated: composed,
					style: { strokeDasharray: viaAlias || composed ? undefined : "4 3" },
					markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
				});
			}
		}

		const layerUses = new Map<
			string,
			{ layer: Layer; properties: Set<string> }
		>();
		if (showLayers) {
			for (const layer of flatten(layers)) {
				const all = [
					...Object.entries(layer.cssVars ?? {}),
					...Object.values(layer.breakpointCssVars ?? {}).flatMap((vars) =>
						Object.entries(vars)
					),
				];
				for (const [property, value] of all) {
					const token = tokenFromCssValue(value, store.tokens);
					if (!token) continue;
					const id = `${LAYER_PREFIX}${layer.id}`;
					const entry = layerUses.get(id) ?? { layer, properties: new Set() };
					entry.properties.add(property);
					layerUses.set(id, entry);
					const edgeId = `${token.path}->${id}`;
					if (!edges.some((e) => e.id === edgeId)) {
						edges.push({
							id: edgeId,
							source: token.path,
							target: id,
							label: property.slice(2),
							markerEnd: {
								type: MarkerType.ArrowClosed,
								width: 14,
								height: 14,
							},
						});
					}
				}
			}
		}

		const maxDepth = Math.max(0, ...depth.values());
		const columns = new Map<number, string[]>();
		const ordered = [...store.tokens].sort(
			(a, b) => a.type.localeCompare(b.type) || a.path.localeCompare(b.path)
		);
		for (const token of ordered) {
			const d = depth.get(token.path) ?? 0;
			columns.set(d, [...(columns.get(d) ?? []), token.path]);
		}
		const position = (column: number, index: number) => ({
			x: column * COLUMN,
			y: index * ROW,
		});

		const nodes: GraphNode[] = [];
		for (const [d, paths] of columns) {
			paths.forEach((path, index) => {
				const token = byPath.get(path) as Token;
				const resolved = resolveToken(
					path,
					mode,
					byPath,
					store.breakpointOrder
				);
				nodes.push({
					id: path,
					type: "token",
					position: position(d, index),
					data: {
						kind: "token",
						token,
						value: resolved.value,
						broken: Boolean(resolved.error),
						dim: false,
					},
				});
			});
		}
		[...layerUses.entries()].forEach(([id, { layer, properties }], index) => {
			nodes.push({
				id,
				type: "layer",
				position: position(maxDepth + 1, index),
				data: { kind: "layer", layer, properties: [...properties], dim: false },
			});
		});
		return { nodes, edges };
	}, [store.tokens, store.mode, store.breakpointOrder, layers, showLayers]);

	// Everything upstream and downstream of a node.
	const connected = (id: string) => {
		const seen = new Set([id]);
		const walk = (key: "source" | "target", other: "source" | "target") => {
			const queue = [id];
			while (queue.length) {
				const current = queue.shift() as string;
				for (const edge of graph.edges) {
					if (edge[key] === current && !seen.has(edge[other])) {
						seen.add(edge[other]);
						queue.push(edge[other]);
					}
				}
			}
		};
		walk("target", "source");
		walk("source", "target");
		return seen;
	};

	const lit = hovered ?? focus;
	const litSet = lit ? connected(lit) : null;
	const focusSet = focus ? connected(focus) : null;

	const nodes = graph.nodes
		.filter((node) => !focusSet || focusSet.has(node.id))
		.map((node) => ({
			...node,
			data: { ...node.data, dim: Boolean(litSet && !litSet.has(node.id)) },
		})) as GraphNode[];
	const edges = graph.edges
		.filter(
			(edge) =>
				!focusSet || (focusSet.has(edge.source) && focusSet.has(edge.target))
		)
		.map((edge) => {
			const on =
				!litSet || (litSet.has(edge.source) && litSet.has(edge.target));
			return {
				...edge,
				style: {
					...edge.style,
					opacity: on ? 1 : 0.12,
					stroke: on && litSet ? "var(--accent)" : undefined,
				},
				labelStyle: { fontSize: 10, fill: "var(--muted-foreground)" },
				labelBgStyle: { fill: "var(--background)" },
			};
		});

	// Refit when focusing narrows or widens what's shown.
	// biome-ignore lint/correctness/useExhaustiveDependencies: refit on focus and layer toggles only
	useEffect(() => {
		requestAnimationFrame(() => fitView({ ...FIT, duration: 200 }));
	}, [focus, showLayers, fitView]);

	const isDark =
		typeof document !== "undefined" &&
		document.documentElement.classList.contains("dark");

	return (
		<div className="relative min-h-0 flex-1">
			<div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md border border-border bg-background p-1 text-control shadow-xs">
				<label className="flex h-6 items-center gap-1.5 px-1.5">
					<input
						type="checkbox"
						checked={showLayers}
						onChange={(event) => setShowLayers(event.target.checked)}
					/>
					Layers
				</label>
				{focus && (
					<button
						type="button"
						onClick={() => setFocus(null)}
						className="flex h-6 items-center gap-1 rounded px-1.5 hover:bg-hover"
					>
						<IconFocus2 className="size-3.5" />
						Showing {focus.startsWith(LAYER_PREFIX) ? "a layer" : focus} · show
						all
					</button>
				)}
			</div>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				nodeTypes={nodeTypes}
				colorMode={isDark ? "dark" : "light"}
				fitView
				fitViewOptions={FIT}
				// Scroll pans, so a tall graph reads like a list.
				panOnScroll
				minZoom={0.2}
				nodesConnectable={false}
				nodesDraggable
				proOptions={{ hideAttribution: true }}
				onNodeMouseEnter={(_, node) => {
					setHovered(node.id);
					if (!node.id.startsWith(LAYER_PREFIX)) store.setHover(node.id);
				}}
				onNodeMouseLeave={() => {
					setHovered(null);
					store.setHover(null);
				}}
				onNodeClick={(_, node) => {
					if (node.id.startsWith(LAYER_PREFIX)) {
						dispatch({
							type: "SELECT_LAYER",
							payload: {
								layerId: node.id.slice(LAYER_PREFIX.length),
								shiftKey: false,
							},
						});
					}
					setFocus(focus === node.id ? null : node.id);
				}}
				onPaneClick={() => setFocus(null)}
			>
				<Background gap={16} size={1} />
				<Controls showInteractive={false} position="bottom-right" />
			</ReactFlow>
			<p className="pointer-events-none absolute bottom-2 left-2 rounded bg-background/80 px-1.5 text-caption text-muted-foreground">
				Raw values on the left flow right into the tokens and layers that read
				them. Hover to trace, click to focus. Dashed: only some modes. fx:
				composed.
			</p>
		</div>
	);
};

/** How tokens feed each other and the layers that use them. */
export const TokenGraph = () => (
	<ReactFlowProvider>
		<Graph />
	</ReactFlowProvider>
);
