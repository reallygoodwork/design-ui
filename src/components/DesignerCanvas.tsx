import { type ReactNode, useEffect, useMemo, useRef } from "react";
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

export const DesignerCanvas = ({ children }: { children: ReactNode }) => {
  const { state } = useDesignerContext();
  const selectedLayers = useSelectedLayers();
  const designerAction = useDesignerAction();
  const viewerRef = useRef<InfiniteViewer>(null);
  const selectoRef = useRef<Selecto>(null);
  const moveableRef = useRef<Moveable>(null);

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
    const moveable = moveableRef.current as { isMoveableElement?: (target: Element) => boolean };
    if (moveable.isMoveableElement?.(element)) {
      return true;
    }

    // Check if element is within Moveable's control box
    // @ts-expect-error - getElement exists at runtime but not in types
    const moveableElement = moveableRef.current?.getElement?.();
    if (moveableElement) {
      // Check if element is within the moveable control box or is a descendant
      const controlBox = moveableElement.querySelector(".moveable-control-box");
      if (controlBox && (controlBox === element || controlBox.contains(element))) {
        return true;
      }

      // Check if element has moveable- prefix class (custom ables)
      if (element.closest("[class*='moveable-']")) {
        return true;
      }
    }

    return false;
  };

  const handleSelect: React.ComponentProps<typeof Selecto>["onSelect"] = (
    e
  ) => {
    const addedLayerIds = e.added.map((el) => el.dataset.layerId);

    // If a new layer was added, select it
    if (addedLayerIds[0]) {
      designerAction({
        type: "SELECT_LAYER",
        payload: { layerId: addedLayerIds[0], shiftKey: false },
      });
    }
    // If clicking outside (nothing added but something was removed), deselect all
    // This happens when clicking outside any selectable layer
    // BUT: don't deselect if clicking on Moveable control elements
    else if (e.added.length === 0 && e.removed.length > 0) {
      // Check if the click target is a Moveable control element
      const clickTarget = e.inputEvent?.target as Element | null;
      if (!isMoveableControlElement(clickTarget)) {
        designerAction({
          type: "DESELECT_ALL",
        });
      }
    }
  };

  const selectedLayerElements = selectedLayers.map((layer) =>
    document.querySelector(
      `.designer-frame .designer-layer[data-layer-id="${layer.id}"]`
    )
  );

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

  // Track selected layers' dimensions for dependency tracking
  const selectedLayersDimensions = useMemo(() => {
    if (selectedLayers.length === 0) return "";
    return selectedLayers
      .map((layer) => ({
        width: layer.cssVars?.["--width"] ?? "",
        height: layer.cssVars?.["--height"] ?? "",
      }))
      .map((dims) => `${dims.width},${dims.height}`)
      .join("|");
  }, [selectedLayers]);

  // Update Moveable when selected layers' dimensions change
  // This ensures the control box resizes immediately when width/height CSS vars are updated
  useEffect(() => {
    if (moveableRef.current && selectedLayersDimensions) {
      // Wait for DOM to update before recalculating rect
      requestAnimationFrame(() => {
        if (moveableRef.current) {
          moveableRef.current.updateRect();
        }
      });
    }
  }, [selectedLayersDimensions]);

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
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [state.selectedLayers, designerAction]);

  return (
    <div
      data-slot="designer-canvas"
      className="group/designer-canvas relative h-full flex-1 bg-muted"
    >
      <Selecto
        ref={selectoRef}
        dragContainer={".designer-canvas"}
        selectableTargets={[".designer-frame .designer-layer"]}
        hitRate={0}
        selectByClick={true}
        selectFromInside={false}
        toggleContinueSelect={["shift"]}
        onSelect={handleSelect}
        onSelectEnd={(e) => {
          // Also handle deselection on selectEnd if nothing is selected after a click
          // This catches edge cases where select event might not fire correctly
          // BUT: don't deselect if clicking on Moveable control elements
          if (e.isClick && e.selected.length === 0 && state.selectedLayers.length > 0) {
            const clickTarget = e.inputEvent?.target as Element | null;
            if (!isMoveableControlElement(clickTarget)) {
              designerAction({
                type: "DESELECT_ALL",
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
            return [
              viewer.getScrollLeft(),
              viewer.getScrollTop(),
            ];
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
        zoomRange={[0.1, 2]}
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
                state.layerTypes.find((lt) => lt.type === selectedLayers[0].type)
                  ?.supportsChildren) ?? false,
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
