import { IconLock } from "@tabler/icons-react";
import type { CSSProperties } from "react";
import type { MoveableManagerInterface, Renderer } from "react-moveable";

interface DimensionAbleProps {
	dimensionViewable: boolean;
	viewerZoom?: number;
	isLocked?: boolean;
}

export const DimensionAble = {
	name: "dimensionViewable",
	props: ["dimensionViewable", "viewerZoom", "isLocked"],
	events: [],
	render(
		moveable: MoveableManagerInterface<DimensionAbleProps, unknown>,
		_React: Renderer
	) {
		const rect = moveable.getRect();
		const isLocked = moveable.props.isLocked ?? false;
		// The label lives inside InfiniteViewer's scaled viewport, so it is scaled by
		// viewerZoom on screen. Counter-scale by 1/viewerZoom (and divide the offsets)
		// to keep it a constant screen size. rect.offsetWidth/Height are unzoomed CSS px.
		const inverse = 1 / (moveable.props.viewerZoom || 1);

		// Add key (required)
		// Add class prefix moveable-(required)
		const style: CSSProperties = {
			"--left": `${2 * inverse}px`,
			"--top": `${rect.height + 4 * inverse}px`,
			transform: `scale(${inverse})`,
			transformOrigin: "left top",
		} as CSSProperties;

		return (
			<div
				key={"dimension-viewer"}
				className={
					"group moveable-dimension top-(--top) left-(--left) flex items-center gap-1 rounded-[4px] bg-blue-500 px-1.5 py-1 text-white will-change-transform text-[11px] absolute"
				}
				style={style}
			>
				<span className="whitespace-nowrap font-medium tabular-nums leading-none">
					{Math.round(rect.offsetWidth)} x {Math.round(rect.offsetHeight)}
				</span>
				{isLocked && (
					<IconLock
						className="size-2.5 shrink-0"
						aria-hidden="true"
						strokeWidth={3}
					/>
				)}
			</div>
		);
	},
} as const;
