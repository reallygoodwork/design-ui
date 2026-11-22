import { Button } from "@base-ui/react";
import { IconPlus } from "@tabler/icons-react";
import type React from "react";
import type { MoveableManagerInterface, Renderer } from "react-moveable";

interface StructureAbleProps {
	supportsChildren?: boolean;
	/** False when the rules lock the layer's parent: no adding beside it. */
	canAddAround?: boolean;
	onOpenAddLayerDialog?: (data: {
		layerId: string;
		position: "before" | "inside" | "after";
	}) => void;
}

export const StructureAble = {
	name: "structureViewable",
	props: ["supportsChildren", "canAddAround", "onOpenAddLayerDialog"],
	events: [],
	render(
		moveable: MoveableManagerInterface<StructureAbleProps, unknown>,
		_React: Renderer
	) {
		const supportsChildren = moveable.props.supportsChildren ?? false;
		const canAddAround = moveable.props.canAddAround ?? true;
		const rect = moveable.getRect();
		const { pos2 } = moveable.state;
		// Get the height of the selected element
		const height = rect.height || rect.offsetHeight || 0;

		// Get the layer ID from the target element
		const targets = moveable.getTargets();
		const target = targets[0];
		const layerId =
			target?.nodeType === 1
				? (target as Element)
						.closest("[data-layer-id]")
						?.getAttribute("data-layer-id") || ""
				: "";

		// Add key (required)
		// Add class prefix moveable-(required)
		// biome-ignore lint/correctness/useHookAtTopLevel: Moveable's useCSS is a styled-component factory, not a React hook
		const EditableViewer = moveable.useCSS(
			"div",
			`
        {
            position: absolute;
            left: 0px;
            top: 0px;
            will-change: transform;
            transform-origin: 0px 0px;
            height: ${height}px;
            z-index: 1000;
            pointer-events: none;
        }
            `
		);

		// Helper function to call callback prop to open dialog
		const openAddLayerDialog = (position: "before" | "inside" | "after") => {
			if (layerId && moveable.props.onOpenAddLayerDialog) {
				moveable.props.onOpenAddLayerDialog({
					layerId,
					position,
				});
			}
		};

		return (
			<EditableViewer
				key={"editable-viewer"}
				style={{
					height: `${height}px`,
					transform: `translate(${pos2[0] / 2 - 12}px, ${pos2[1]}px)`,
					pointerEvents: "none",
				}}
			>
				{/* Top button - positioned above the frame */}
				{canAddAround && (
					<Button
						data-moveable-control="true"
						className="size-6 bg-muted-foreground text-background rounded-full leading-none text-control flex items-center justify-center hover:bg-gray-500 active:bg-gray-600 shrink-0 absolute top-0"
						title="Add layer before"
						style={{
							transform: "translateY(calc(-100% - 2px))",
							pointerEvents: "auto",
						}}
						onClick={(e) => {
							e.stopPropagation();
							openAddLayerDialog("before");
						}}
					>
						<IconPlus
							className="size-2.5 shrink-0"
							aria-hidden="true"
							strokeWidth={3}
						/>
					</Button>
				)}
				{/* Middle button - only show if layer supports children */}
				{supportsChildren && (
					<Button
						data-moveable-control="true"
						className="size-6 bg-muted-foreground text-background rounded-full leading-none text-control flex items-center justify-center hover:bg-gray-500 active:bg-gray-600 shrink-0 absolute top-0"
						title="Add layer inside"
						style={
							{
								transform: `translateY(calc(${height}px / 2 - 12px))`,
								pointerEvents: "auto",
								// marginBottom: "4px",
							} as React.CSSProperties
						}
						onClick={(e) => {
							e.stopPropagation();
							openAddLayerDialog("inside");
						}}
					>
						<IconPlus
							className="size-2.5 shrink-0"
							aria-hidden="true"
							strokeWidth={3}
						/>
					</Button>
				)}
				{/* Bottom button - positioned at the bottom of the frame */}
				{canAddAround && (
					<Button
						data-moveable-control="true"
						className="size-6 bg-muted-foreground text-background rounded-full leading-none text-control flex items-center justify-center hover:bg-gray-500 active:bg-gray-600 shrink-0 absolute top-0"
						title="Add layer after"
						style={
							{
								transform: `translateY(calc(${height}px + 2px))`,
								pointerEvents: "auto",
							} as React.CSSProperties
						}
						onClick={(e) => {
							e.stopPropagation();
							openAddLayerDialog("after");
						}}
					>
						<IconPlus
							className="size-2.5 shrink-0"
							aria-hidden="true"
							strokeWidth={3}
						/>
					</Button>
				)}
			</EditableViewer>
		);
	},
} as const;
