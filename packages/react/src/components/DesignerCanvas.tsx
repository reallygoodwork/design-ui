import {
	acceptsChildren,
	buildLayerIndex,
	calculateBoundingBox,
	getLayer,
} from "@design-ui/core";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import InfiniteViewer, { type OnPinch } from "react-infinite-viewer";
import Moveable, { type MoveableRefTargetType } from "react-moveable";
import Selecto from "react-selecto";
import { useAllowed } from "../hooks/useAllowed";
import { useDesignerAction } from "../hooks/useDesignerAction";
import { useDesignerContext } from "../hooks/useDesignerContext";
import {
	type FrameRegistry,
	useFrameRegistry,
} from "../hooks/useFrameRegistry";
import { useSelectedLayers } from "../hooks/useSelectedLayers";
import { centeredScroll, shouldRecenter } from "../lib/canvasCentering";
import { CURSOR_ARROW } from "../lib/cursors";
import { isControlTarget } from "../lib/keyboardTargets";
import { DimensionAble } from "./ables/DimensionAble";
import { StructureAble } from "./ables/StructureAble";

// Lock filtering for layers under a point. The registry returns unfiltered ids,
// shallowest (parent) first, which enables Figma-style drill-down selection.
const getLayersAtPoint = (
	registry: FrameRegistry,
	x: number,
	y: number,
	state: ReturnType<typeof useDesignerContext>["state"]
): { layerIds: string[]; breakpointId: string | null } => {
	const { layerIds, breakpointId } = registry.layersAtPoint(x, y);
	const layerIndex = buildLayerIndex(state.layers);
	return {
		layerIds: layerIds.filter((id) => {
			const layer = getLayer(layerIndex, id);
			return layer && !layer.isLocked;
		}),
		breakpointId,
	};
};

type Ghost = {
	id: string;
	breakpointId?: string;
	left: number;
	top: number;
	width: number;
	height: number;
};

const ghostSelector = (id: string) =>
	`[data-selection-ghost="${CSS.escape(id)}"]`;

const sameGhosts = (a: Ghost[], b: Ghost[]) =>
	a.length === b.length &&
	a.every(
		(g, i) =>
			g.id === b[i].id &&
			g.left === b[i].left &&
			g.top === b[i].top &&
			g.width === b[i].width &&
			g.height === b[i].height
	);

export const DesignerCanvas = ({ children }: { children: ReactNode }) => {
	const { state } = useDesignerContext();
	const selectedLayers = useSelectedLayers();
	const designerAction = useDesignerAction();
	const registry = useFrameRegistry();
	const viewerRef = useRef<InfiniteViewer>(null);
	const selectoRef = useRef<Selecto>(null);
	const moveableRef = useRef<Moveable>(null);

	// Track click state for drill-down selection
	const [clickState, setClickState] = useState<{
		x: number;
		y: number;
		timestamp: number;
		layerIdsAtPoint: string[];
		currentIndex: number;
	} | null>(null);

	const handlePinch = (e: OnPinch) => {
		// Update zoom state when user pinches/zooms
		// Clamp zoom between 0.1 and 10 for reasonable bounds
		designerAction({
			type: "SET_ZOOM",
			payload: Math.max(0.1, Math.min(10, e.zoom)),
		});
	};

	const handleScroll = () => {
		selectoRef.current?.checkScroll();
		// InfiniteViewer owns scrolling; dispatching SET_PAN here re-rendered every
		// context consumer on each scroll event and nothing reads `state.pan`.
	};

	// Helper function to check if an element is within Moveable's control area
	const isMoveableControlElement = (element: Element | null): boolean => {
		if (!element || !moveableRef.current) return false;

		// Check if element or any parent has data-moveable-control attribute (our custom buttons)
		if (element.closest("[data-moveable-control='true']")) return true;

		// Check if element is a Moveable control element
		const moveable = moveableRef.current as {
			isMoveableElement?: (target: Element) => boolean;
		};
		if (moveable.isMoveableElement?.(element)) return true;

		// Never treat design content as a Moveable control
		if (element.closest(".designer-layer")) return false;

		// Check if element is within Moveable's control box (handles, lines, custom ables)
		const controlBox = moveableRef.current.getControlBoxElement?.();
		if (controlBox?.contains(element)) return true;

		// Custom ables render inside the control box; match only Moveable's own classes
		return Boolean(
			element.closest(".moveable-control-box, .moveable-dimension")
		);
	};

	// Helper to process click selection with drill-down logic
	const processClickSelection = (
		clickX: number,
		clickY: number,
		shiftKey: boolean
	) => {
		const currentTime = Date.now();

		// Get all layers at this point (ordered shallowest/parent first) and the breakpoint
		const { layerIds: layersAtPoint, breakpointId } = getLayersAtPoint(
			registry,
			clickX,
			clickY,
			state
		);

		// If clicking outside any layer, deselect
		if (layersAtPoint.length === 0) {
			designerAction({
				type: "DESELECT_ALL",
			});
			setClickState(null);
			recenterIfDrifted();
			return;
		}

		// Check if this is a drill-down click (same position within 500ms)
		const isSamePosition =
			clickState &&
			Math.abs(clickState.x - clickX) < 5 &&
			Math.abs(clickState.y - clickY) < 5 &&
			currentTime - clickState.timestamp < 500;

		let layerToSelect: string;

		if (isSamePosition && clickState.layerIdsAtPoint.length > 1) {
			// Drill down: cycle to next layer in the stack (parent -> child -> deeper child -> back to parent)
			const nextIndex =
				(clickState.currentIndex + 1) % clickState.layerIdsAtPoint.length;
			layerToSelect = clickState.layerIdsAtPoint[nextIndex];

			// Update click state with new index
			setClickState({
				x: clickX,
				y: clickY,
				timestamp: currentTime,
				layerIdsAtPoint: clickState.layerIdsAtPoint,
				currentIndex: nextIndex,
			});
		} else {
			// New click position or timeout: select the shallowest/parent (first) layer
			layerToSelect = layersAtPoint[0];

			// Initialize click state
			setClickState({
				x: clickX,
				y: clickY,
				timestamp: currentTime,
				layerIdsAtPoint: layersAtPoint,
				currentIndex: 0,
			});
		}

		// Select the layer (handle shift key for multi-select)
		// Also set the active breakpoint based on which frame was clicked
		designerAction({
			type: "SELECT_LAYER",
			payload: {
				layerId: layerToSelect,
				shiftKey,
				breakpointId: breakpointId ?? undefined,
			},
		});
	};

	// We don't use onSelect for click handling - we use onSelectEnd instead
	// This avoids issues with Selecto's event timing
	const handleSelect: React.ComponentProps<typeof Selecto>["onSelect"] = () => {
		// Intentionally empty - all selection logic is handled in onSelectEnd
	};

	// Moveable targets the selected layers' elements in the active breakpoint.
	// Look them up after the DOM commits, not while rendering: a layer added
	// and selected in one step has no element yet during this render.
	const [selectedLayerElements, setSelectedLayerElements] = useState<
		(HTMLElement | null)[]
	>([]);
	useLayoutEffect(() => {
		const next = selectedLayers.map((layer) =>
			registry.queryLayer(state.activeBreakpointId, layer.id)
		);
		setSelectedLayerElements((prev) =>
			prev.length === next.length && prev.every((el, i) => el === next[i])
				? prev
				: next
		);
	}, [registry, selectedLayers, state.activeBreakpointId]);

	/**
	 * Moveable can't measure inside a shadow root: its parent walk stops at the
	 * root. So it targets a stand-in for each selected layer, placed over the
	 * layer in canvas units, outside the shadow root.
	 */
	// The editing rules can lock the selected layer or its parent.
	const selectedLimits = useAllowed(selectedLayers[0]?.id);
	const parentLimits = useAllowed(
		(selectedLayers[0] && state.nodes[selectedLayers[0].id]?.parentId) ??
			undefined
	);

	const [ghosts, setGhosts] = useState<Ghost[]>([]);
	const [viewport, setViewport] = useState<HTMLElement | null>(null);
	useLayoutEffect(() => {
		setViewport(viewerRef.current?.getViewport() ?? null);
	}, []);
	const measureGhosts = useCallback(() => {
		const viewport = viewerRef.current?.getViewport();
		const zoom = viewerRef.current?.getZoom() ?? 1;
		if (!viewport) return;
		const base = viewport.getBoundingClientRect();
		const next = selectedLayerElements.flatMap((el) => {
			if (!el) return [];
			const r = el.getBoundingClientRect();
			return [
				{
					id: el.dataset.layerId ?? "",
					breakpointId: el.dataset.breakpointId,
					left: (r.left - base.left) / zoom,
					top: (r.top - base.top) / zoom,
					width: r.width / zoom,
					height: r.height / zoom,
				},
			];
		});
		setGhosts((prev) => (sameGhosts(prev, next) ? prev : next));
		requestAnimationFrame(() => moveableRef.current?.updateRect());
	}, [selectedLayerElements]);

	// Sync zoom changes from keyboard/controls to InfiniteViewer
	useEffect(() => {
		if (viewerRef.current) {
			viewerRef.current.setZoom(state.zoom);
		}
	}, [state.zoom]);

	/** The visible part of the canvas, in canvas units. */
	const getView = useCallback(() => {
		const viewer = viewerRef.current;
		if (!viewer) return null;
		const zoom = viewer.getZoom();
		return {
			x: viewer.getScrollLeft(),
			y: viewer.getScrollTop(),
			width: viewer.getContainerWidth() / zoom,
			height: viewer.getContainerHeight() / zoom,
		};
	}, []);

	/**
	 * Put the artboards in the middle of the canvas. `animate` glides there,
	 * unless the person prefers reduced motion.
	 */
	const centerOnBreakpoints = useCallback(
		({ animate = false }: { animate?: boolean } = {}) => {
			const viewer = viewerRef.current;
			if (!viewer) return;
			viewer.resize();
			if (state.breakpoints.length === 0) return;
			const view = getView();
			if (!view) return;
			// getScrollLeft/scrollTo work in canvas units, not screen pixels.
			const target = centeredScroll(
				calculateBoundingBox(state.breakpoints),
				view
			);
			const reduceMotion = window.matchMedia?.(
				"(prefers-reduced-motion: reduce)"
			).matches;
			viewer.scrollTo(target.x, target.y, {
				duration: animate && !reduceMotion ? 300 : 0,
				easing: (t: number) => 1 - (1 - t) ** 3,
			});
		},
		[state.breakpoints, getView]
	);

	// Clicking off a layer may glide the artboards back to the middle.
	const recenterIfDrifted = () => {
		const view = getView();
		if (!view || state.breakpoints.length === 0) return;
		if (shouldRecenter(view, calculateBoundingBox(state.breakpoints))) {
			centerOnBreakpoints({ animate: true });
		}
	};

	// Keep the same point in the middle when the canvas changes size, e.g. the
	// window resizes or a panel opens, so centered artboards stay centered.
	useEffect(() => {
		const viewer = viewerRef.current;
		const el = viewer?.getContainer();
		// Missing outside browsers, e.g. in jsdom tests.
		if (!viewer || !el || typeof ResizeObserver === "undefined") return;
		let last = { width: el.clientWidth, height: el.clientHeight };
		const observer = new ResizeObserver(() => {
			const next = { width: el.clientWidth, height: el.clientHeight };
			const zoom = viewer.getZoom();
			viewer.resize();
			viewer.scrollBy(
				(last.width - next.width) / 2 / zoom,
				(last.height - next.height) / 2 / zoom
			);
			last = next;
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	const hasContentToCenter = state.breakpoints.length > 0;

	// Center on initial mount
	const [hasCentered, setHasCentered] = useState(false);
	useEffect(() => {
		if (hasCentered || !hasContentToCenter) return;
		// A frame later, so a viewer torn down by a remount (StrictMode) isn't
		// left with a pending scroll.
		const frame = requestAnimationFrame(() => {
			centerOnBreakpoints();
			setHasCentered(true);
		});
		return () => cancelAnimationFrame(frame);
	}, [hasContentToCenter, hasCentered, centerOnBreakpoints]);

	// Respond to explicit center requests (e.g., from zoom-to-fit)
	useEffect(() => {
		if (state.centerRequestId === 0) return;
		// A frame later, so the new zoom is applied first
		const frame = requestAnimationFrame(() => centerOnBreakpoints());
		return () => cancelAnimationFrame(frame);
	}, [state.centerRequestId, centerOnBreakpoints]);

	// Update Moveable when zoom changes so it recalculates positions and scales correctly
	useEffect(() => {
		if (moveableRef.current && state.zoom > 0) {
			// Force Moveable to update its rect calculations when zoom changes
			moveableRef.current.updateRect();
		}
	}, [state.zoom]);

	// Re-measure after anything that can move or resize a selected layer:
	// the selection, any layer edit, or an artboard moving or resizing.
	const breakpointGeometryKey = useMemo(
		() =>
			state.breakpoints
				.map(
					(bp) =>
						`${bp.id}:${bp.position.x}:${bp.position.y}:${bp.width}:${bp.height}`
				)
				.join("|"),
		[state.breakpoints]
	);
	// biome-ignore lint/correctness/useExhaustiveDependencies: nodes, frame styles and geometry trigger a re-measure; they aren't read
	useLayoutEffect(() => {
		measureGhosts();
	}, [measureGhosts, state.nodes, state.frameStyles, breakpointGeometryKey]);

	// A layer can also resize on its own, e.g. an image loading.
	useEffect(() => {
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(() => measureGhosts());
		for (const el of selectedLayerElements) if (el) observer.observe(el);
		return () => observer.disconnect();
	}, [selectedLayerElements, measureGhosts]);

	// Handle keyboard shortcuts: Delete/Backspace for deletion, Cmd/Ctrl+Z for undo, Cmd/Ctrl+Y for redo
	useEffect(() => {
		const isInputField = (target: HTMLElement): boolean =>
			target.tagName === "INPUT" ||
			target.tagName === "TEXTAREA" ||
			target.isContentEditable;

		const handleDelete = (e: KeyboardEvent, target: HTMLElement): boolean => {
			if (
				(e.key === "Delete" || e.key === "Backspace") &&
				state.selectedLayers.length > 0 &&
				!isControlTarget(target)
			) {
				e.preventDefault();
				designerAction({
					type: "DELETE_LAYERS",
					payload: { layerIds: state.selectedLayers },
				});
				return true;
			}
			return false;
		};

		const handleUndo = (e: KeyboardEvent, target: HTMLElement): boolean => {
			if (
				(e.metaKey || e.ctrlKey) &&
				e.key === "z" &&
				!e.shiftKey &&
				!isInputField(target)
			) {
				e.preventDefault();
				designerAction({ type: "UNDO" });
				return true;
			}
			return false;
		};

		const handleRedo = (e: KeyboardEvent, target: HTMLElement): boolean => {
			if (
				((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) ||
				((e.metaKey || e.ctrlKey) && e.key === "y")
			) {
				if (!isInputField(target)) {
					e.preventDefault();
					designerAction({ type: "REDO" });
					return true;
				}
			}
			return false;
		};

		const handleZoom = (e: KeyboardEvent): boolean => {
			if (!(e.metaKey || e.ctrlKey)) return false;

			switch (e.key) {
				case "+":
				case "=":
					e.preventDefault();
					designerAction({
						type: "SET_ZOOM",
						payload: Math.min(10, state.zoom + 0.1),
					});
					return true;
				case "-":
				case "_":
					e.preventDefault();
					designerAction({
						type: "SET_ZOOM",
						payload: Math.max(0.1, state.zoom - 0.1),
					});
					return true;
				case "0":
					e.preventDefault();
					designerAction({ type: "SET_ZOOM", payload: 1 });
					designerAction({ type: "SET_PAN", payload: { x: 0, y: 0 } });
					return true;
				case "1":
					// Zoom to fit all breakpoint frames
					if (state.breakpoints.length > 0) {
						e.preventDefault();
						const boundingBox = calculateBoundingBox(state.breakpoints);
						const padding = 200;
						const availableWidth = window.innerWidth - padding;
						const availableHeight = window.innerHeight - padding;
						const zoomX = availableWidth / boundingBox.width;
						const zoomY = availableHeight / boundingBox.height;
						const newZoom = Math.min(zoomX, zoomY, 10);
						designerAction({ type: "SET_ZOOM", payload: newZoom });
						// Signal to center on all breakpoints
						designerAction({ type: "CENTER_ON_BREAKPOINTS" });
					}
					return true;
				case "2":
					e.preventDefault();
					designerAction({ type: "SET_ZOOM", payload: 1 });
					return true;
				default:
					return false;
			}
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			if (
				handleDelete(e, target) ||
				handleUndo(e, target) ||
				handleRedo(e, target) ||
				handleZoom(e)
			) {
				return;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [state.selectedLayers, state.zoom, state.breakpoints, designerAction]);

	return (
		<div
			data-slot="designer-canvas"
			className="group/designer-canvas relative h-full flex-1 bg-muted"
			style={{ cursor: CURSOR_ARROW }}
		>
			<Selecto
				ref={selectoRef}
				dragContainer={"[data-slot='designer-canvas']"}
				selectableTargets={[() => registry.getAllLayerElements()]}
				dragCondition={(e) => {
					const target = e.inputEvent?.target;
					return !(
						target instanceof Element &&
						target.closest("[data-breakpoint-header]")
					);
				}}
				hitRate={0}
				selectByClick={true}
				selectFromInside={true}
				toggleContinueSelect={["shift"]}
				onSelect={handleSelect}
				onSelectEnd={(e) => {
					const inputEvent = e.inputEvent as MouseEvent | undefined;
					if (!inputEvent) return;

					// Check if clicking on Moveable controls - if so, ignore
					const clickTarget = inputEvent.target as Element | null;
					if (isMoveableControlElement(clickTarget)) return;

					if (e.isClick) {
						// Handle click selection with our custom drill-down logic
						processClickSelection(
							inputEvent.clientX,
							inputEvent.clientY,
							inputEvent.shiftKey
						);
					} else if (e.selected.length > 0) {
						// Handle drag selections - select based on what Selecto found
						const selectedElement = e.selected[0] as HTMLElement;
						const selectedLayerId = selectedElement?.dataset?.layerId;
						// Get the breakpoint ID from the parent breakpoint frame
						const breakpointFrame = selectedElement?.closest(
							"[data-breakpoint-id]"
						);
						const breakpointId =
							breakpointFrame?.getAttribute("data-breakpoint-id");

						if (selectedLayerId) {
							designerAction({
								type: "SELECT_LAYER",
								payload: {
									layerId: selectedLayerId,
									shiftKey: false,
									breakpointId: breakpointId ?? undefined,
								},
							});
						}
					}
				}}
				onScroll={({ direction }) => {
					viewerRef.current?.scrollBy(direction[0] * 10, direction[1] * 10);
				}}
				scrollOptions={{
					container: () => {
						const viewer = viewerRef.current;
						if (!viewer) throw new Error("Viewer ref is not available");
						return viewer.getElement();
					},
					getScrollPosition: () => {
						const viewer = viewerRef.current;
						if (!viewer) return [0, 0];
						return [viewer.getScrollLeft(), viewer.getScrollTop()];
					},
					throttleTime: 30,
					threshold: 0,
				}}
			/>
			<InfiniteViewer
				ref={viewerRef}
				className="designer-canvas size-full"
				margin={3000}
				zoom={state.zoom}
				usePinch={true}
				// useMouseDrag={true}
				useAutoZoom={false}
				zoomRange={[0.1, 10]}
				onPinch={handlePinch}
				onScroll={handleScroll}
			>
				{children}
				{/* InfiniteViewer zooms its first child, so stand-ins go in there. */}
				{viewport &&
					createPortal(
						ghosts.map((g) => (
							<div
								key={g.id}
								aria-hidden="true"
								data-selection-ghost={g.id}
								data-layer-id={g.id}
								data-breakpoint-id={g.breakpointId}
								className="pointer-events-none absolute"
								style={{
									left: g.left,
									top: g.top,
									width: g.width,
									height: g.height,
								}}
							/>
						)),
						viewport
					)}
				<Moveable
					ables={[DimensionAble, StructureAble]}
					ref={moveableRef}
					target={
						(ghosts.length === 1
							? ghostSelector(ghosts[0].id)
							: ghosts.map((g) => ghostSelector(g.id))) as MoveableRefTargetType
					}
					draggable={false}
					edgeDraggable={false}
					props={{
						dimensionViewable: true,
						structureViewable: true,
						viewerZoom: state.zoom,
						isLocked: selectedLayers[0]?.isLocked ?? false,
						supportsChildren:
							Boolean(
								selectedLayers[0] &&
									state.layerTypes.find(
										(lt) => lt.type === selectedLayers[0].type
									)?.supportsChildren
							) && acceptsChildren(selectedLimits),
						canAddAround: acceptsChildren(parentLimits),
						onOpenAddLayerDialog: (data: {
							layerId: string;
							position: "before" | "inside" | "after";
						}) => {
							designerAction({
								type: "OPEN_ADD_LAYER_DIALOG",
								payload: {
									layerId: data.layerId,
									position: data.position,
								},
							});
						},
					}}
				/>
			</InfiniteViewer>
		</div>
	);
};
