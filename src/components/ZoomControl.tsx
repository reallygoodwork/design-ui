import { Menu as BaseMenu } from "@base-ui/react/menu";
import { IconChevronDown } from "@tabler/icons-react";
import { useDesignerContext } from "../hooks/useDesignerContext";

export const ZoomControl = () => {
	const { state, dispatch } = useDesignerContext();
	const currentZoom = state.zoom;

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
		// Calculate zoom to fit based on frame size
		if (state.frameSize) {
			const containerWidth = window.innerWidth;
			const containerHeight = window.innerHeight;
			const frameWidth = state.frameSize.width;
			const frameHeight = state.frameSize.height;

			// Add some padding (e.g., 100px on each side)
			const padding = 200;
			const availableWidth = containerWidth - padding;
			const availableHeight = containerHeight - padding;

			const zoomX = availableWidth / frameWidth;
			const zoomY = availableHeight / frameHeight;
			const newZoom = Math.min(zoomX, zoomY, 10); // Don't zoom beyond 10x

			dispatch({ type: "SET_ZOOM", payload: newZoom });
		}
	};

	const handleResetZoom = () => {
		dispatch({ type: "SET_ZOOM", payload: 1 });
		dispatch({ type: "SET_PAN", payload: { x: 0, y: 0 } });
	};

	const displayZoom = `${Math.round(currentZoom * 100)}%`;

	return (
		<BaseMenu.Root>
			<BaseMenu.Trigger className="flex h-7 items-center gap-1.5 rounded-md border border-transparent bg-input px-2 py-1 text-xs outline-none transition-[color,box-shadow] hover:bg-input/80 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
				{displayZoom}
				<IconChevronDown className="size-3" />
			</BaseMenu.Trigger>
			<BaseMenu.Portal>
				<BaseMenu.Positioner className="z-50" sideOffset={8} align="end">
					<BaseMenu.Popup className="min-w-[8rem] origin-(--transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md duration-100 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
						<fieldset>
							<BaseMenu.Item
								className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-hidden focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 justify-between"
								onClick={handleZoomIn}
							>
								Zoom In
								<span
									data-slot="shortcut"
									className="inline-flex translate-x-0.5 gap-0.5 text-muted-foreground/70 text-xs"
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
								className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-hidden focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 justify-between"
								onClick={handleZoomOut}
							>
								Zoom Out
								<span
									data-slot="shortcut"
									className="inline-flex translate-x-0.5 gap-0.5 text-muted-foreground/70 text-xs"
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
						<div className="-mx-1 my-1 h-px bg-border" role="separator" />
						<fieldset>
							<BaseMenu.Item
								className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-hidden focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 justify-between"
								onClick={handleZoomTo100}
							>
								Zoom to 100%
								<span
									data-slot="shortcut"
									className="inline-flex translate-x-0.5 gap-0.5 text-muted-foreground/70 text-xs"
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
								className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-hidden focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 justify-between"
								onClick={handleZoomToFit}
							>
								Zoom to Fit
								<span
									data-slot="shortcut"
									className="inline-flex translate-x-0.5 gap-0.5 text-muted-foreground/70 text-xs"
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
						<div className="-mx-1 my-1 h-px bg-border" role="separator" />
						<BaseMenu.Item
							className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-hidden focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 justify-between"
							onClick={handleResetZoom}
						>
							Reset Zoom
							<span
								data-slot="shortcut"
								className="inline-flex translate-x-0.5 gap-0.5 text-muted-foreground/70 text-xs"
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
