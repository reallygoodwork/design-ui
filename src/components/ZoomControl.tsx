import { Menu as BaseMenu } from "@base-ui/react/menu";
import { IconChevronDown } from "@tabler/icons-react";
import { useDesignerAction } from "../hooks/useDesignerAction";
import { useDesignerSelector } from "../hooks/useDesignerSelector";
import { useZoom } from "../hooks/useZoom";
import { calculateBoundingBox } from "../lib/breakpointUtils";

export const ZoomControl = () => {
	const dispatch = useDesignerAction();
	const currentZoom = useZoom();
	const breakpoints = useDesignerSelector((state) => state.breakpoints);

	const handleZoomIn = () => {
		const newZoom = Math.min(10, currentZoom + 0.1);
		dispatch({ type: "SET_ZOOM", payload: newZoom });
	};

	const handleZoomOut = () => {
		const newZoom = Math.max(0.1, currentZoom - 0.1);
		dispatch({ type: "SET_ZOOM", payload: newZoom });
	};

	const handleZoomTo100 = () => {
		dispatch({ type: "SET_ZOOM", payload: 1 });
	};

	const handleZoomToFit = () => {
		const containerWidth = window.innerWidth;
		const containerHeight = window.innerHeight;
		const padding = 200;
		const availableWidth = containerWidth - padding;
		const availableHeight = containerHeight - padding;

		// Use breakpoints bounding box if available
		if (breakpoints.length > 0) {
			const boundingBox = calculateBoundingBox(breakpoints);
			const zoomX = availableWidth / boundingBox.width;
			const zoomY = availableHeight / boundingBox.height;
			const newZoom = Math.min(zoomX, zoomY, 10);
			dispatch({ type: "SET_ZOOM", payload: newZoom });
			// Signal to center on all breakpoints
			dispatch({ type: "CENTER_ON_BREAKPOINTS" });
		}
	};

	const handleResetZoom = () => {
		dispatch({ type: "SET_ZOOM", payload: 1 });
		dispatch({ type: "SET_PAN", payload: { x: 0, y: 0 } });
	};

	const displayZoom = `${Math.round(currentZoom * 100)}%`;

	return (
		<BaseMenu.Root>
			<BaseMenu.Trigger className="flex h-7 items-center gap-1.5 rounded-md border border-transparent bg-input px-2 py-1 font-mono text-value outline-none transition-[color,box-shadow] hover:bg-input/80 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring">
				{displayZoom}
				<IconChevronDown className="size-3" />
			</BaseMenu.Trigger>
			<BaseMenu.Portal>
				<BaseMenu.Positioner className="z-50" sideOffset={8} align="end">
					<BaseMenu.Popup className="ds-popup ds-surface min-w-[8rem] overflow-hidden p-1">
						<fieldset>
							<BaseMenu.Item
								className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-control outline-hidden focus:bg-hover focus:text-hover-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 justify-between"
								onClick={handleZoomIn}
							>
								Zoom In
								<span
									data-slot="shortcut"
									className="inline-flex translate-x-0.5 gap-0.5 text-muted-foreground/70 text-control"
								>
									<span className="inline-flex min-w-3 items-center justify-center">
										⌘
									</span>
									<span className="inline-flex min-w-3 items-center justify-center">
										+
									</span>
								</span>
							</BaseMenu.Item>
							<BaseMenu.Item
								className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-control outline-hidden focus:bg-hover focus:text-hover-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 justify-between"
								onClick={handleZoomOut}
							>
								Zoom Out
								<span
									data-slot="shortcut"
									className="inline-flex translate-x-0.5 gap-0.5 text-muted-foreground/70 text-control"
								>
									<span className="inline-flex min-w-3 items-center justify-center">
										⌘
									</span>
									<span className="inline-flex min-w-3 items-center justify-center">
										-
									</span>
								</span>
							</BaseMenu.Item>
						</fieldset>
						<hr className="-mx-1 my-1 h-px bg-border" />
						<fieldset>
							<BaseMenu.Item
								className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-control outline-hidden focus:bg-hover focus:text-hover-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 justify-between"
								onClick={handleZoomTo100}
							>
								Zoom to 100%
								<span
									data-slot="shortcut"
									className="inline-flex translate-x-0.5 gap-0.5 text-muted-foreground/70 text-control"
								>
									<span className="inline-flex min-w-3 items-center justify-center">
										⌘
									</span>
									<span className="inline-flex min-w-3 items-center justify-center">
										2
									</span>
								</span>
							</BaseMenu.Item>
							<BaseMenu.Item
								className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-control outline-hidden focus:bg-hover focus:text-hover-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 justify-between"
								onClick={handleZoomToFit}
							>
								Zoom to Fit
								<span
									data-slot="shortcut"
									className="inline-flex translate-x-0.5 gap-0.5 text-muted-foreground/70 text-control"
								>
									<span className="inline-flex min-w-3 items-center justify-center">
										⌘
									</span>
									<span className="inline-flex min-w-3 items-center justify-center">
										1
									</span>
								</span>
							</BaseMenu.Item>
						</fieldset>
						<hr className="-mx-1 my-1 h-px bg-border" />
						<BaseMenu.Item
							className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-control outline-hidden focus:bg-hover focus:text-hover-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 justify-between"
							onClick={handleResetZoom}
						>
							Reset Zoom
							<span
								data-slot="shortcut"
								className="inline-flex translate-x-0.5 gap-0.5 text-muted-foreground/70 text-control"
							>
								<span className="inline-flex min-w-3 items-center justify-center">
									⌘
								</span>
								<span className="inline-flex min-w-3 items-center justify-center">
									0
								</span>
							</span>
						</BaseMenu.Item>
					</BaseMenu.Popup>
				</BaseMenu.Positioner>
			</BaseMenu.Portal>
		</BaseMenu.Root>
	);
};
