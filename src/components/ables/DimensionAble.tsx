import { IconLock } from "@tabler/icons-react";
import type { CSSProperties } from "react";
import type { MoveableManagerInterface, Renderer } from "react-moveable";

interface DimensionAbleProps {
	dimensionViewable: boolean;
	zoom?: number;
	isLocked?: boolean;
}

export const DimensionAble = {
	name: "dimensionViewable",
	props: ["dimensionViewable", "zoom", "isLocked"],
	events: [],
	render(
		moveable: MoveableManagerInterface<DimensionAbleProps, unknown>,
		_React: Renderer
	) {
		const rect = moveable.getRect();
		const isLocked = moveable.props.isLocked ?? false;
		// Moveable's custom ables are rendered in a fixed position container outside InfiniteViewer's transform context
		// So they're not affected by zoom and should maintain constant size
		// Moveable handles positioning relative to the target element automatically

		// Add key (required)
		// Add class prefix moveable-(required)
		const style: CSSProperties = {
			"--left": `2px`,
			"--top": `${rect.height + 4}px`,
			transformOrigin: "center top",
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
