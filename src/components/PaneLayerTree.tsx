import { Input } from "@base-ui/react/input";
import {
	IconChevronRight,
	IconDeviceDesktop,
	IconLock,
	IconLockOpen,
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
import { useDesignerAction } from "../hooks/useDesignerAction";
import { useDesignerContext } from "../hooks/useDesignerContext";
import { useLayers } from "../hooks/useLayers";
import { useLayerTypes } from "../hooks/useLayerTypes";
import { useSelectedLayers } from "../hooks/useSelectedLayers";
import {
	isPrimaryBreakpoint,
	sortBreakpointsByWidth,
} from "../lib/breakpointUtils";
import { cn } from "../lib/cn";
import type { Breakpoint, Layer } from "../lib/Types";

// Helper function to find a layer by ID in a nested structure
const findLayerById = (layers: Layer[], layerId: string): Layer | null => {
	for (const layer of layers) {
		if (layer.id === layerId) {
			return layer;
		}
		if (layer.children) {
			const found = findLayerById(layer.children, layerId);
			if (found) return found;
		}
	}
	return null;
};

// Helper function to check if a layer is a descendant of another
const isDescendantOf = (
	layers: Layer[],
	potentialDescendantId: string,
	potentialAncestorId: string
): boolean => {
	const ancestor = findLayerById(layers, potentialAncestorId);
	if (!ancestor?.children) return false;

	for (const child of ancestor.children) {
		if (child.id === potentialDescendantId) return true;
		if (isDescendantOf([child], potentialDescendantId, child.id)) return true;
	}
	return false;
};

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

	return (
		<TreeItemContent>
			{({ isExpanded, hasChildItems }) => (
				<div
					className="group/pane-layer-tree-item relative flex flex-1 items-center gap-1"
					data-editing={isEditing}
				>
					{/* Chevron for expandable items */}
					{hasChildItems ? (
						<Button
							slot="chevron"
							className="flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent/50"
						>
							<IconChevronRight
								className={`size-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
							/>
						</Button>
					) : (
						<span className="size-4 shrink-0" />
					)}

					{/* Layer icon and name */}
					<button
						type="button"
						className="flex flex-1 cursor-default items-center gap-2 truncate bg-transparent border-none p-0 text-left"
						onDoubleClick={handleDoubleClick}
					>
						<span className="size-3.5 [&_svg:not([class*='size-'])]:size-3.5 shrink-0 text-muted-foreground opacity-80">
							{layerType?.icon}
						</span>
						<span
							className={`truncate text-xs leading-normal ${isEditing ? "opacity-0" : ""}`}
						>
							{layer.name}
						</span>
					</button>

					{/* Inline rename input */}
					{isEditing && (
						<Input
							data-slot="input"
							value={layer.name}
							className="absolute -top-0.5 right-8 left-8.25 z-10 h-6 min-w-0 rounded-md border border-input bg-input px-2 py-0.5 -translate-y-0.25 text-xs outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 leading-none"
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

					{/* Lock button */}
					<button
						type="button"
						className={`flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 hover:bg-accent/50 group-hover/pane-layer-tree-item:opacity-100 ${layer.isLocked ? "opacity-100" : ""}`}
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
			)}
		</TreeItemContent>
	);
};

/**
 * Breakpoint section header in the layer tree.
 */
const BreakpointSectionHeader = ({
	breakpoint,
	isActive,
	isExpanded,
	onToggle,
	onClick,
}: {
	breakpoint: Breakpoint;
	isActive: boolean;
	isExpanded: boolean;
	onToggle: () => void;
	onClick: () => void;
}) => {
	const { state } = useDesignerContext();
	const isPrimary = isPrimaryBreakpoint(breakpoint.id, state.breakpoints);

	return (
		<button
			type="button"
			className={cn(
				"flex items-center gap-1.5 px-2 py-1.5 cursor-pointer select-none rounded-md w-full text-left",
				isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
			)}
			onClick={onClick}
		>
			<button
				type="button"
				className="flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent/50"
				onClick={(e) => {
					e.stopPropagation();
					onToggle();
				}}
			>
				<IconChevronRight
					className={cn(
						"size-3 transition-transform",
						isExpanded && "rotate-90"
					)}
				/>
			</button>
			<IconDeviceDesktop className="size-3.5 text-muted-foreground" />
			<span className="flex-1 text-xs font-medium truncate">
				{breakpoint.name}
			</span>
			{isPrimary && (
				<span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">
					Primary
				</span>
			)}
			<span className="text-[10px] text-muted-foreground tabular-nums">
				{breakpoint.width}×{breakpoint.height}
			</span>
		</button>
	);
};

export const PaneLayerTree = () => {
	const { state } = useDesignerContext();
	const layers = useLayers();
	const layerTypes = useLayerTypes();
	const selectedLayers = useSelectedLayers();
	const designerAction = useDesignerAction();

	// Track expanded breakpoint sections
	const [expandedBreakpoints, setExpandedBreakpoints] = useState<Set<string>>(
		() => new Set(state.breakpoints.map((bp) => bp.id))
	);

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

	// Create a selection handler that includes the breakpointId
	const createSelectionHandler = (breakpointId: string) => {
		return (keys: "all" | Set<React.Key>) => {
			if (keys === "all") {
				return;
			}

			const keyArray = [...keys] as string[];

			if (keyArray.length === 0) {
				designerAction({ type: "DESELECT_ALL" });
			} else {
				const lastKey = keyArray[keyArray.length - 1];
				designerAction({
					type: "SELECT_LAYER",
					payload: {
						layerId: lastKey,
						shiftKey: keyArray.length > 1,
						breakpointId,
					},
				});
			}
		};
	};

	const handleBreakpointClick = (breakpointId: string) => {
		designerAction({
			type: "SELECT_BREAKPOINT",
			payload: { breakpointId },
		});
	};

	const toggleBreakpointExpanded = (breakpointId: string) => {
		setExpandedBreakpoints((prev) => {
			const next = new Set(prev);
			if (next.has(breakpointId)) {
				next.delete(breakpointId);
			} else {
				next.add(breakpointId);
			}
			return next;
		});
	};

	const renderItem = (layer: Layer) => {
		const hasChildren = layer.children && layer.children.length > 0;

		return (
			<TreeItem
				key={layer.id}
				id={layer.id}
				textValue={layer.name}
				className={({ isSelected, isFocusVisible, isHovered, isDropTarget }) =>
					`flex cursor-default items-center gap-1 rounded-md pr-1 py-0.5 pl-[calc(calc(var(--tree-item-level)-1)*0.5rem)] text-sm outline-none h-7 ${
						isSelected
							? "bg-accent text-accent-foreground"
							: isHovered
								? "bg-accent/50"
								: ""
					} ${isFocusVisible ? "ring-2 ring-ring ring-offset-1" : ""} ${isDropTarget ? "bg-primary/20 ring-2 ring-primary" : ""}`
				}
			>
				<LayerTreeItemContent layer={layer} />
				{hasChildren && (
					<Collection items={layer.children}>{renderItem}</Collection>
				)}
			</TreeItem>
		);
	};

	// Sort breakpoints by width (mobile-first)
	const sortedBreakpoints = sortBreakpointsByWidth(state.breakpoints);

	// If no breakpoints, show flat layer tree (backwards compatibility)
	if (sortedBreakpoints.length === 0) {
		return (
			<Tree
				aria-label="Layer tree"
				selectionMode="single"
				selectedKeys={new Set(selectedLayers.map((l) => l.id))}
				onSelectionChange={createSelectionHandler("")}
				expandedKeys={expandedKeys}
				onExpandedChange={(keys) => setExpandedKeys(keys as Set<string>)}
				dragAndDropHooks={dragAndDropHooks}
				items={layers}
				className="-m-1 flex flex-col gap-0.5 overflow-y-auto p-1 outline-none"
			>
				{renderItem}
			</Tree>
		);
	}

	// Show breakpoints as collapsible sections
	return (
		<div className="-m-1 flex flex-col gap-1 overflow-y-auto p-1">
			{sortedBreakpoints.map((breakpoint) => {
				const isActive = state.activeBreakpointId === breakpoint.id;
				const isExpanded = expandedBreakpoints.has(breakpoint.id);

				return (
					<div key={breakpoint.id} className="flex flex-col">
						<BreakpointSectionHeader
							breakpoint={breakpoint}
							isActive={isActive}
							isExpanded={isExpanded}
							onToggle={() => toggleBreakpointExpanded(breakpoint.id)}
							onClick={() => handleBreakpointClick(breakpoint.id)}
						/>
						{isExpanded && (
							<div className="ml-2 border-l border-border pl-2">
								<Tree
									aria-label={`${breakpoint.name} layer tree`}
									selectionMode="single"
									selectedKeys={
										isActive
											? new Set(selectedLayers.map((l) => l.id))
											: new Set()
									}
									onSelectionChange={createSelectionHandler(breakpoint.id)}
									expandedKeys={expandedKeys}
									onExpandedChange={(keys) =>
										setExpandedKeys(keys as Set<string>)
									}
									dragAndDropHooks={dragAndDropHooks}
									items={layers}
									className="flex flex-col gap-0.5 outline-none"
								>
									{renderItem}
								</Tree>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
};
