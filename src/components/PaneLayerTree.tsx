import { Input } from "@base-ui/react/input";
import {
	acceptsChildren,
	buildLayerIndex,
	getDescendantIds as collectDescendantIds,
	getLayer,
	isDescendant,
	isPrimaryBreakpoint,
	sortBreakpointsByWidth,
} from "@design-ui/core";
import {
	IconChevronRight,
	IconDeviceDesktop,
	IconGripVertical,
	IconLock,
	IconLockOpen,
	IconPlus,
} from "@tabler/icons-react";
import { useRef, useState } from "react";
import {
	Button,
	Collection,
	Tree,
	TreeItem,
	TreeItemContent,
	useDragAndDrop,
} from "react-aria-components";
import { useOnClickOutside } from "usehooks-ts";
import { useAllowed } from "../hooks/useAllowed";
import { useDesignerAction } from "../hooks/useDesignerAction";
import { useDesignerSelector } from "../hooks/useDesignerSelector";
import { useLayers } from "../hooks/useLayers";
import { useLayerTypes } from "../hooks/useLayerTypes";
import { useSelectedLayers } from "../hooks/useSelectedLayers";
import { cn } from "../lib/cn";
import type { Breakpoint, Layer } from "../lib/Types";
import { type Category, CategoryChip } from "./common/CategoryChip";

const findLayerById = (layers: Layer[], layerId: string): Layer | null =>
	getLayer(buildLayerIndex(layers), layerId);

const isDescendantOf = (
	layers: Layer[],
	potentialDescendantId: string,
	potentialAncestorId: string
): boolean =>
	isDescendant(
		buildLayerIndex(layers),
		potentialDescendantId,
		potentialAncestorId
	);

const getDescendantIds = (layers: Layer[], layerIds: string[]): Set<string> =>
	collectDescendantIds(buildLayerIndex(layers), layerIds);

export interface RowState {
	isSelected: boolean;
	isHovered: boolean;
	isInSelection: boolean;
	isFocusVisible: boolean;
	isDropTarget?: boolean;
}

const ROW_BASE =
	"flex min-w-0 cursor-default items-center gap-1 rounded-md pr-1 py-0.5 pl-[calc(calc(var(--tree-item-level)-1)*0.5rem)] text-control outline-none h-7";

/** Layer types share the hue of the pane that edits them most. */
const layerCategory = (type: string): Category =>
	type === "frame"
		? "layout"
		: type === "text"
			? "type"
			: type === "image"
				? "image"
				: "layer";

// Tint < hover < selected, in both themes.
const SELECTED_CLASS = "bg-selected text-foreground";
const HOVER_CLASS = "bg-hover";
const TINT_CLASS = "bg-hover/50";

const rowBackground = (s: RowState) => {
	if (s.isDropTarget) return "bg-primary/20 ring-2 ring-primary";
	if (s.isSelected) return SELECTED_CLASS;
	if (s.isHovered) return HOVER_CLASS;
	if (s.isInSelection) return TINT_CLASS;
	return "";
};

export const rowStateClass = (s: RowState) =>
	`${ROW_BASE} ${rowBackground(s)} ${s.isFocusVisible ? "ring-2 ring-ring ring-offset-1" : ""}`;

const LayerTreeItemContent = ({ layer }: { layer: Layer }) => {
	const ref = useRef<HTMLInputElement>(null);
	const [isEditing, setIsEditing] = useState(false);
	const layerTypes = useLayerTypes();
	const designerAction = useDesignerAction();

	useOnClickOutside(ref, () => {
		setIsEditing(false);
	});

	const handleDoubleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		setIsEditing(true);
	};

	const handleLayerNameChange = (name: string) => {
		designerAction({
			type: "UPDATE_LAYER_NAME",
			payload: { layerId: layer.id, name },
		});
	};

	const handleLayerLockChange = () => {
		designerAction({
			type: "UPDATE_LAYER_LOCK",
			payload: { layerId: layer.id, isLocked: !layer.isLocked },
		});
	};

	const layerType = layerTypes.find((lt) => lt.type === layer.type);
	// The editing rules can lock this layer, or the one it sits in.
	const limits = useAllowed(layer.id);
	const parentId = useDesignerSelector(
		(s) => s.nodes[layer.id]?.parentId ?? undefined
	);
	const parentLimits = useAllowed(parentId);

	return (
		<TreeItemContent>
			{({ isExpanded, hasChildItems, isSelected }) => {
				const canAdd =
					isSelected &&
					!!layerType?.supportsChildren &&
					!layer.isLocked &&
					acceptsChildren(limits);
				return (
					<div
						className="group/pane-layer-tree-item relative flex min-w-0 flex-1 items-center gap-1"
						data-editing={isEditing}
					>
						{/* Drag handle: overlaid (absolute) just left of the lock button so it takes no layout space; shown on hover/focus. Disabled for locked layers, which cannot be dragged. */}
						<Button
							slot="drag"
							aria-label={`Drag ${layer.name}`}
							isDisabled={layer.isLocked || parentLimits.structureLocked}
							className={`absolute top-1/2 ${canAdd ? "right-10" : "right-5"} z-[5] flex size-4 -translate-y-1/2 items-center justify-center rounded bg-background text-muted-foreground opacity-0 hover:bg-hover focus-visible:opacity-100 group-focus-within/pane-layer-tree-item:opacity-100 group-hover/pane-layer-tree-item:opacity-100 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-0 data-[disabled]:group-hover/pane-layer-tree-item:opacity-40`}
						>
							<IconGripVertical className="size-3" />
						</Button>

						{/* Chevron for expandable items */}
						{hasChildItems ? (
							<Button
								slot="chevron"
								className="flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-hover/50"
							>
								<IconChevronRight
									className={`size-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
								/>
							</Button>
						) : (
							<span className="size-4 shrink-0" />
						)}

						{/* Layer icon and name */}
						{/* biome-ignore lint/a11y/noStaticElementInteractions: must stay non-interactive so the row press is not swallowed */}
						<div
							className="flex min-w-0 flex-1 cursor-default items-center gap-2 truncate bg-transparent border-none p-0 text-left"
							onDoubleClick={handleDoubleClick}
						>
							<CategoryChip category={layerCategory(layer.type)} size="sm">
								{layerType?.icon}
							</CategoryChip>
							<span
								className={`truncate text-control leading-normal ${isEditing ? "opacity-0" : ""}`}
								title={layer.name}
							>
								{layer.name}
							</span>
						</div>

						{/* Inline rename input */}
						{isEditing && (
							<Input
								data-slot="input"
								value={layer.name}
								className="absolute -top-0.5 right-8 left-8.25 z-10 h-6 min-w-0 rounded-md border border-input bg-input px-2 py-0.5 -translate-y-0.25 text-control outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring leading-none"
								onChange={(e) => handleLayerNameChange(e.target.value)}
								ref={ref}
								autoFocus
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === "Escape") {
										setIsEditing(false);
									}
								}}
							/>
						)}

						{/* Add a layer inside: shown on the selected layer when it can hold others */}
						{canAdd && (
							<button
								type="button"
								aria-label={`Add layer inside ${layer.name}`}
								title={`Add layer inside ${layer.name}`}
								className="flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-hover/50 hover:text-foreground"
								onClick={(e) => {
									e.stopPropagation();
									designerAction({
										type: "OPEN_ADD_LAYER_DIALOG",
										payload: { layerId: layer.id, position: "inside" },
									});
								}}
							>
								<IconPlus className="size-3" />
							</button>
						)}

						{/* Lock button */}
						<button
							type="button"
							className={`flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 hover:bg-hover/50 group-hover/pane-layer-tree-item:opacity-100 ${layer.isLocked ? "opacity-100" : ""}`}
							title={layer.isLocked ? "Unlock layer" : "Lock layer"}
							onClick={(e) => {
								e.stopPropagation();
								handleLayerLockChange();
							}}
						>
							{layer.isLocked ? (
								<IconLock className="size-3" />
							) : (
								<IconLockOpen className="size-3" />
							)}
						</button>
					</div>
				);
			}}
		</TreeItemContent>
	);
};

/**
 * One frame in the list above the layers. Selecting it opens its settings and
 * makes it the breakpoint that style edits apply to.
 */
const FrameRow = ({
	breakpoint,
	isActive,
	isSelected,
	isPrimary,
	onClick,
}: {
	breakpoint: Breakpoint;
	isActive: boolean;
	isSelected: boolean;
	isPrimary: boolean;
	onClick: () => void;
}) => (
	<button
		type="button"
		aria-current={isActive ? "true" : undefined}
		onClick={onClick}
		className={cn(
			"flex h-7 w-full cursor-default items-center gap-2 rounded-md px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
			isSelected
				? SELECTED_CLASS
				: isActive
					? "bg-hover text-hover-foreground"
					: "hover:bg-hover/50"
		)}
	>
		<IconDeviceDesktop className="size-3.5 shrink-0 text-muted-foreground" />
		<span className="min-w-0 flex-1 truncate text-control">
			{breakpoint.name}
		</span>
		{isPrimary && (
			<span className="rounded bg-primary/20 px-1.5 py-0.5 font-medium text-caption text-primary">
				Primary
			</span>
		)}
		<span className="font-mono text-muted-foreground text-value">
			{breakpoint.width}×{breakpoint.height}
		</span>
	</button>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
	<h3 className="px-2 pb-1 font-medium text-caption text-muted-foreground">
		{children}
	</h3>
);

export const PaneLayerTree = () => {
	const breakpoints = useDesignerSelector((state) => state.breakpoints);
	const activeBreakpointId = useDesignerSelector(
		(state) => state.activeBreakpointId
	);
	const selectedBreakpointId = useDesignerSelector(
		(state) => state.selectedBreakpointId
	);
	const layers = useLayers();
	const layerTypes = useLayerTypes();
	const selectedLayers = useSelectedLayers();
	const designerAction = useDesignerAction();

	// Get all expanded keys (all layers with children)
	const getExpandedKeys = (layerList: Layer[]): string[] => {
		const keys: string[] = [];
		for (const layer of layerList) {
			if (layer.children && layer.children.length > 0) {
				keys.push(layer.id);
				keys.push(...getExpandedKeys(layer.children));
			}
		}
		return keys;
	};

	const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
		() => new Set(getExpandedKeys(layers))
	);

	const { dragAndDropHooks } = useDragAndDrop({
		getItems: (keys) => {
			// Prevent dragging locked layers
			for (const key of keys) {
				const layer = findLayerById(layers, key.toString());
				if (layer?.isLocked) {
					return [];
				}
			}
			return [...keys].map((key) => ({ "text/plain": key.toString() }));
		},

		onMove(e) {
			const targetKey = e.target.key as string;
			const draggedKeys = [...e.keys] as string[];

			// Prevent dropping a layer into its own descendants
			for (const draggedKey of draggedKeys) {
				if (
					draggedKey === targetKey ||
					isDescendantOf(layers, targetKey, draggedKey)
				) {
					return;
				}
			}

			designerAction({
				type: "MOVE_LAYER",
				payload: {
					layerIds: draggedKeys,
					targetId: targetKey,
					position: e.target.dropPosition,
				},
			});
		},

		shouldAcceptItemDrop(target) {
			// Find target layer and check if its type supports children
			const targetLayer = findLayerById(layers, target.key as string);
			if (!targetLayer) return false;

			const targetType = layerTypes.find((lt) => lt.type === targetLayer.type);
			return targetType?.supportsChildren ?? false;
		},
	});

	// Selection leaves the active breakpoint alone: there is one tree, and the
	// frame being edited is chosen separately.
	const handleSelectionChange = (keys: "all" | Set<React.Key>) => {
		if (keys === "all") return;
		const keyArray = [...keys] as string[];
		if (keyArray.length === 0) {
			designerAction({ type: "DESELECT_ALL" });
			return;
		}
		designerAction({
			type: "SELECT_LAYER",
			payload: {
				layerId: keyArray[keyArray.length - 1],
				shiftKey: keyArray.length > 1,
			},
		});
	};

	// Everything inside the selection gets a lighter tint (Figma-style)
	const selectedSubtreeIds = getDescendantIds(
		layers,
		selectedLayers.map((l) => l.id)
	);
	// React Aria caches items by identity; invalidate when the tint changes
	const subtreeDependency = [...selectedSubtreeIds].join(",");

	const renderItem = (layer: Layer) => {
		const hasChildren = layer.children && layer.children.length > 0;
		const isInSelection = selectedSubtreeIds.has(layer.id);

		return (
			<TreeItem
				key={layer.id}
				data-in-selection={isInSelection ? "true" : undefined}
				id={layer.id}
				textValue={layer.name}
				className={(state) => rowStateClass({ ...state, isInSelection })}
			>
				<LayerTreeItemContent layer={layer} />
				{hasChildren && (
					<Collection items={layer.children} dependencies={[subtreeDependency]}>
						{renderItem}
					</Collection>
				)}
			</TreeItem>
		);
	};

	// A single frame needs no list, and no headings to tell the lists apart
	const showFrames = breakpoints.length > 1;

	return (
		<div className="-m-1 flex min-w-0 flex-col gap-3 overflow-x-hidden overflow-y-auto p-1">
			{showFrames && (
				<section>
					<SectionTitle>Frames</SectionTitle>
					<div className="flex flex-col gap-0.5">
						{sortBreakpointsByWidth(breakpoints).map((breakpoint) => (
							<FrameRow
								key={breakpoint.id}
								breakpoint={breakpoint}
								isActive={activeBreakpointId === breakpoint.id}
								isSelected={selectedBreakpointId === breakpoint.id}
								isPrimary={isPrimaryBreakpoint(breakpoint.id, breakpoints)}
								onClick={() =>
									designerAction({
										type: "SELECT_BREAKPOINT",
										payload: { breakpointId: breakpoint.id },
									})
								}
							/>
						))}
					</div>
				</section>
			)}
			<section>
				{showFrames && <SectionTitle>Layers</SectionTitle>}
				<Tree
					aria-label="Layer tree"
					selectionMode="single"
					selectedKeys={new Set(selectedLayers.map((l) => l.id))}
					onSelectionChange={handleSelectionChange}
					expandedKeys={expandedKeys}
					onExpandedChange={(keys) => setExpandedKeys(keys as Set<string>)}
					dragAndDropHooks={dragAndDropHooks}
					items={layers}
					dependencies={[subtreeDependency]}
					className="flex min-w-0 flex-col gap-0.5 outline-none"
					renderEmptyState={() => (
						<p className="px-2 py-1 text-caption text-muted-foreground">
							No layers yet. Press T for text, F for a frame or I for an image.
						</p>
					)}
				>
					{renderItem}
				</Tree>
			</section>
		</div>
	);
};
