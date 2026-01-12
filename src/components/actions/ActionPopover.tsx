import { Button } from "@base-ui/react/button";
import { Popover } from "@base-ui/react/popover";
import { IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { DesignAction } from "../DesignAction";

interface ActionPopoverProps {
	cssProperty: string | string[];
	label: string;
	popoverTitle: string;
	triggerDisplayValue: string;
	showSwatch?: boolean;
	swatchColor?: string;
	children: ReactNode;
}

export const ActionPopover = ({
	cssProperty,
	label,
	popoverTitle,
	triggerDisplayValue,
	showSwatch = false,
	swatchColor,
	children,
}: ActionPopoverProps) => {
	const selectedLayers = useSelectedLayers();
	const designerAction = useDesignerAction();
	const selectedLayer = selectedLayers[0];

	// Determine if there's a value based on cssProperty
	const hasValue = (() => {
		if (Array.isArray(cssProperty)) {
			return cssProperty.some((prop) =>
				Boolean(selectedLayer?.cssVars?.[prop]),
			);
		}
		return Boolean(selectedLayer?.cssVars?.[cssProperty]);
	})();

	const handleClear = () => {
		if (selectedLayer) {
			const cssProps = Array.isArray(cssProperty) ? cssProperty : [cssProperty];
			const css = cssProps.reduce(
				(acc, prop) => {
					acc[prop] = "";
					return acc;
				},
				{} as Record<string, string>,
			);

			designerAction({
				type: "UPDATE_LAYER_CSS",
				payload: { id: selectedLayer.id, css },
			});
		}
	};

	return (
		<DesignAction label={label}>
			<Popover.Root>
				<Popover.Trigger
					className="inline-flex items-center gap-1 whitespace-nowrap rounded-md font-medium text-xs leading-none transition-all focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[4px] focus-visible:ring-ring/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-3.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 justify-start bg-input text-input-foreground hover:bg-input/80 h-7 px-2 py-1 has-[>svg]:px-2 lowercase data-[empty=true]:text-muted-foreground tabular-nums max-w-32 w-fit flex-1 truncate"
					data-empty={!hasValue}
				>
					<span
						className={[
							"font-normal truncate",
							hasValue ? "text-foreground" : "text-muted-foreground",
						].join(" ")}
					>
						{triggerDisplayValue}
					</span>
					{showSwatch && (
						<span
							className="ml-auto flex size-3 shrink-0 rounded-xs"
							style={{
								backgroundColor: swatchColor || "#ffffff",
							}}
						></span>
					)}
				</Popover.Trigger>
				<Popover.Portal>
					<Popover.Positioner sideOffset={104} side="left" align="start">
						<Popover.Popup className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-64 origin-(--radix-popover-content-transform-origin) rounded-lg border border-border/50 bg-background p-4 text-foreground shadow-lg outline-hidden data-[state=closed]:animate-out data-[state=open]:animate-in">
							<div className="flex flex-col gap-1 text-center sm:text-left">
								<Popover.Title className="font-semibold text-xs leading-none">
									{popoverTitle}
								</Popover.Title>
							</div>
							<div className="shrink-0 bg-border h-px -mx-4 my-4 w-auto"></div>
							<div className="flex w-full flex-col gap-2">{children}</div>
						</Popover.Popup>
					</Popover.Positioner>
				</Popover.Portal>
			</Popover.Root>
			<Button
				onClick={handleClear}
				disabled={!hasValue}
				className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md font-medium text-xs leading-none transition-all focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[4px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 bg-input text-input-foreground hover:bg-input/80 size-7 justify-center p-0 active:scale-95 [&_svg:not([class*='size-'])]:size-3.5"
			>
				<IconX />
			</Button>
		</DesignAction>
	);
};
