import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import InfiniteViewer, {
	type OnPinch,
	type OnScroll,
} from "react-infinite-viewer";
import Moveable, { type MoveableRefTargetType } from "react-moveable";
import Selecto from "react-selecto";
import { useDesignerAction } from "../hooks/useDesignerAction";
import { useDesignerContext } from "../hooks/useDesignerContext";
import { useSelectedLayers } from "../hooks/useSelectedLayers";

import { DimensionAble } from "./ables/DimensionAble";
import { StructureAble } from "./ables/StructureAble";

// Helper to get all layers at a specific point, ordered from shallowest (parent) to deepest (nested child)
// This enables Figma-style selection: first click selects parent, subsequent clicks drill down
const getLayersAtPoint = (
	x: number,
	y: number,
	state: ReturnType<typeof useDesignerContext>["state"]
): string[] => {
	// Get all elements at this point (document.elementsFromPoint returns front-to-back, i.e. deepest first)
	const elements = document.elementsFromPoint(x, y);

	// Filter to only designer layers and extract layer IDs
	const layerIds = elements
		.filter(
			(el) =>
				el.classList.contains("designer-layer") &&
				el.hasAttribute("data-layer-id")
		)
		.map((el) => el.getAttribute("data-layer-id"))
		.filter((id): id is string => id !== null);

	// Helper to find a layer by ID recursively
	const findLayer = (
		layers: typeof state.layers,
		id: string
	): (typeof state.layers)[0] | null => {
		for (const layer of layers) {
			if (layer.id === id) return layer;
			if (layer.children) {
				const found = findLayer(layer.children, id);
				if (found) return found;
			}
		}
		return null;
	};

	// Filter out locked layers, then reverse so shallowest (parent) is first
	return layerIds
		.filter((id) => {
			const layer = findLayer(state.layers, id);
			return layer && !layer.isLocked;
		})
		.reverse();
};

export const DesignerCanvas = ({ children }: { children: ReactNode }) => {
	const { state } = useDesignerContext();
	const selectedLayers = useSelectedLayers();
	const designerAction = useDesignerAction();
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

	const handleScroll = (e: OnScroll) => {
		selectoRef.current?.checkScroll();
		// Track scroll position for reference
		// InfiniteViewer handles the actual scrolling internally
		designerAction({
			type: "SET_PAN",
			payload: {
				x: e.scrollLeft,
				y: e.scrollTop,
			},
		});
	};

	// Helper function to check if an element is within Moveable's control area
	const isMoveableControlElement = (element: Element | null): boolean => {
		if (!element || !moveableRef.current) return false;

		// Check if element or any parent has data-moveable-control attribute (our custom buttons)
		if (element.closest("[data-moveable-control='true']")) {
			return true;
		}

		// Check if element is a Moveable control element
		const moveable = moveableRef.current as {
			isMoveableElement?: (target: Element) => boolean;
		};
		if (moveable.isMoveableElement?.(element)) {
			return true;
		}

		// Check if element is within Moveable's control box
		// @ts-expect-error - getElement exists at runtime but not in types
		const moveableElement = moveableRef.current?.getElement?.();
		if (moveableElement) {
			// Check if element is within the moveable control box or is a descendant
			const controlBox = moveableElement.querySelector(".moveable-control-box");
			if (
				controlBox &&
				(controlBox === element || controlBox.contains(element))
			) {
				return true;
			}

			// Check if element has moveable- prefix class (custom ables)
			if (element.closest("[class*='moveable-']")) {
				return true;
			}
		}

		return false;
	};

	// Helper to process click selection with drill-down logic
	const processClickSelection = (
		clickX: number,
		clickY: number,
		shiftKey: boolean
	) => {
		const currentTime = Date.now();

		// Get all layers at this point (ordered shallowest/parent first)
		const layersAtPoint = getLayersAtPoint(clickX, clickY, state);

		// If clicking outside any layer, deselect
		if (layersAtPoint.length === 0) {
			designerAction({
				type: "DESELECT_ALL",
			});
			setClickState(null);
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
		designerAction({
			type: "SELECT_LAYER",
			payload: { layerId: layerToSelect, shiftKey },
		});
	};

	// We don't use onSelect for click handling - we use onSelectEnd instead
	// This avoids issues with Selecto's event timing
	const handleSelect: React.ComponentProps<typeof Selecto>["onSelect"] = () => {
		// Intentionally empty - all selection logic is handled in onSelectEnd
	};

	const selectedLayerElements = selectedLayers.map((layer) =>
		document.querySelector(
			`.designer-frame .designer-layer[data-layer-id="${layer.id}"]`
		)
	);

	// Sync zoom changes from keyboard/controls to InfiniteViewer
	useEffect(() => {
		console.log("Zoom state changed to:", state.zoom);
		if (viewerRef.current) {
			console.log("Calling setZoom on InfiniteViewer:", state.zoom);
			viewerRef.current.setZoom(state.zoom);
		} else {
			console.log("viewerRef.current is null");
		}
	}, [state.zoom]);

	// Center the frame when it mounts, frame size changes, or zoom changes
	useEffect(() => {
		if (viewerRef.current && state.frameSize) {
			// Use multiple requestAnimationFrame calls to ensure InfiniteViewer is fully initialized
			// and the scroll area is properly sized

			const viewer = viewerRef.current;
			if (!viewer) return;

			// Ensure InfiniteViewer has calculated all dimensions
			viewer.resize();

			// Use scrollCenter which handles offsets and margins internally
			// According to InfiniteViewer source, scrollCenter centers the scroll area
			// Since our frame is centered with margin: auto, the scroll area center = frame center
			viewer.scrollCenter({
				horizontal: true,
				vertical: true,
			});
		}
		// We intentionally include state.zoom to recenter when zoom changes
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.frameSize]);

	// Update Moveable when zoom changes so it recalculates positions and scales correctly
	useEffect(() => {
		if (moveableRef.current) {
			// Force Moveable to update its rect calculations when zoom changes
			moveableRef.current.updateRect();

			// Apply inverse scale to Moveable's control box to counteract InfiniteViewer zoom
			// Use a small delay to ensure Moveable has rendered its controls
			requestAnimationFrame(() => {
				// @ts-expect-error - getElement exists at runtime but not in types
				const moveableElement = moveableRef.current?.getElement?.();
				if (moveableElement) {
					const controlBoxes = moveableElement.querySelectorAll(
						".moveable-control-box"
					) as NodeListOf<HTMLElement>;
					const inverseScale = 1 / state.zoom;
					controlBoxes.forEach((controlBox) => {
						// Read existing transform and combine with our scale
						const existingTransform = controlBox.style.transform || "";
						// Combine transforms: append our scale so it's applied after Moveable's positioning
						// CSS transforms are applied left-to-right, so we want: [Moveable's transforms] scale(ourScale)
						if (existingTransform && !existingTransform.includes("scale")) {
							controlBox.style.transform = `${existingTransform} scale(${inverseScale})`;
						} else if (!existingTransform) {
							controlBox.style.transform = `scale(${inverseScale})`;
						} else {
							// Replace existing scale if present (in case Moveable added one)
							controlBox.style.transform = existingTransform.replace(
								/scale\([^)]+\)/,
								`scale(${inverseScale})`
							);
						}
					});
				}
			});
		}
	}, [state.zoom]);

	// Track selected layers' CSS vars for dependency tracking
	// Include all properties that could affect element dimensions
	const selectedLayersCSSVars = useMemo(() => {
		if (selectedLayers.length === 0) return "";
		return selectedLayers
			.map((layer) => JSON.stringify(layer.cssVars ?? {}))
			.join("|");
	}, [selectedLayers]);

	// Update Moveable when selected layers' CSS vars change
	// This ensures the control box updates immediately when any dimension-affecting CSS is updated
	useEffect(() => {
		if (moveableRef.current && selectedLayersCSSVars) {
			// Wait for DOM to update before recalculating rect
			requestAnimationFrame(() => {
				if (moveableRef.current) {
					moveableRef.current.updateRect();
				}
			});
		}
	}, [selectedLayersCSSVars]);

	// Handle keyboard shortcuts: Delete/Backspace for deletion, Cmd/Ctrl+Z for undo, Cmd/Ctrl+Y for redo
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			const isInputField =
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable;

			// Handle Delete/Backspace for layer deletion
			if (
				(e.key === "Delete" || e.key === "Backspace") &&
				state.selectedLayers.length > 0
			) {
				// Don't delete if user is typing in an input field
				if (isInputField) {
					return;
				}

				e.preventDefault();
				// Delete all selected layers (and their children)
				state.selectedLayers.forEach((layerId) => {
					designerAction({
						type: "DELETE_LAYER",
						payload: { layerId },
					});
				});
				return;
			}

			// Handle Cmd/Ctrl+Z for undo
			if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
				// Allow undo in input fields (normal browser behavior)
				// But also handle our undo if not in an input field
				if (!isInputField) {
					e.preventDefault();
					designerAction({ type: "UNDO" });
				}
				return;
			}

			// Handle Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y for redo
			if (
				((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) ||
				((e.metaKey || e.ctrlKey) && e.key === "y")
			) {
				// Allow redo in input fields (normal browser behavior)
				// But also handle our redo if not in an input field
				if (!isInputField) {
					e.preventDefault();
					designerAction({ type: "REDO" });
				}
				return;
			}

			// Handle zoom shortcuts
			if (e.metaKey || e.ctrlKey) {
				// Zoom In: Cmd/Ctrl + (or Cmd/Ctrl =)
				if (e.key === "+" || e.key === "=") {
					console.log("DesignerCanvas: Zoom in triggered");
					e.preventDefault();
					const newZoom = Math.min(10, state.zoom + 0.1);
					designerAction({ type: "SET_ZOOM", payload: newZoom });
					return;
				}

				// Zoom Out: Cmd/Ctrl -
				if (e.key === "-" || e.key === "_") {
					console.log("DesignerCanvas: Zoom out triggered");
					e.preventDefault();
					const newZoom = Math.max(0.1, state.zoom - 0.1);
					designerAction({ type: "SET_ZOOM", payload: newZoom });
					return;
				}

				// Reset Zoom: Cmd/Ctrl 0
				if (e.key === "0") {
					console.log("DesignerCanvas: Reset zoom triggered");
					e.preventDefault();
					designerAction({ type: "SET_ZOOM", payload: 1 });
					designerAction({ type: "SET_PAN", payload: { x: 0, y: 0 } });
					return;
				}

				// Zoom to Fit: Cmd/Ctrl 1
				if (e.key === "1") {
					console.log("DesignerCanvas: Zoom to fit triggered");
					e.preventDefault();
					if (state.frameSize) {
						const containerWidth = window.innerWidth;
						const containerHeight = window.innerHeight;
						const frameWidth = state.frameSize.width;
						const frameHeight = state.frameSize.height;

						const padding = 200;
						const availableWidth = containerWidth - padding;
						const availableHeight = containerHeight - padding;

						const zoomX = availableWidth / frameWidth;
						const zoomY = availableHeight / frameHeight;
						const newZoom = Math.min(zoomX, zoomY, 10);

						designerAction({ type: "SET_ZOOM", payload: newZoom });
					}
					return;
				}

				// Zoom to 100%: Cmd/Ctrl 2
				if (e.key === "2") {
					console.log("DesignerCanvas: Zoom to 100% triggered");
					e.preventDefault();
					designerAction({ type: "SET_ZOOM", payload: 1 });
					return;
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [state.selectedLayers, state.zoom, state.frameSize, designerAction]);

	return (
		<div
			data-slot="designer-canvas"
			className="group/designer-canvas relative h-full flex-1 bg-muted"
		>
			<Selecto
				ref={selectoRef}
				dragContainer={"[data-slot='designer-canvas']"}
				selectableTargets={[".designer-frame .designer-layer"]}
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
						const selectedLayerId = (e.selected[0] as HTMLElement)?.dataset
							?.layerId;
						if (selectedLayerId) {
							designerAction({
								type: "SELECT_LAYER",
								payload: { layerId: selectedLayerId, shiftKey: false },
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
				margin={1000}
				zoom={state.zoom}
				usePinch={true}
				// useMouseDrag={true}
				useAutoZoom={false}
				zoomRange={[0.1, 10]}
				onPinch={handlePinch}
				onScroll={handleScroll}
			>
				{children}
				<Moveable
					ables={[DimensionAble, StructureAble]}
					ref={moveableRef}
					target={selectedLayerElements as MoveableRefTargetType}
					draggable={true}
					throttleDrag={1}
					edgeDraggable={false}
					startDragRotate={0}
					// scrollable={true}
					throttleDragRotate={0}
					onDrag={(e) => {
						e.target.style.transform = e.transform;
					}}
					props={{
						dimensionViewable: true,
						structureViewable: true,
						zoom: state.zoom,
						isLocked: selectedLayers[0]?.isLocked ?? false,
						supportsChildren:
							(selectedLayers[0] &&
								state.layerTypes.find(
									(lt) => lt.type === selectedLayers[0].type
								)?.supportsChildren) ??
							false,
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
