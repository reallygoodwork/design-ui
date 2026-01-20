import { Popover } from "@base-ui/react/popover";
import type { ReactNode } from "react";
import { ClearButton } from "../common/ClearButton";
import { DesignAction } from "../DesignAction";

interface ActionPopoverProps {
	label: string;
	popoverTitle: string;
	triggerDisplayValue: string;
	hasValue?: boolean;
	onClear?: () => void;
	showSwatch?: boolean;
	swatchColor?: string;
	children: ReactNode;
	onOpenChange?: (open: boolean) => void;
}

export const ActionPopover = ({
	label,
	popoverTitle,
	triggerDisplayValue,
	hasValue = false,
	onClear,
	showSwatch = false,
	swatchColor,
	children,
	onOpenChange,
}: ActionPopoverProps) => {
	return (
		<DesignAction label={label}>
			<Popover.Root onOpenChange={onOpenChange}>
				<Popover.Trigger
					className="inline-flex items-center gap-1 whitespace-nowrap rounded-md font-medium text-xs leading-none transition-all focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[4px] focus-visible:ring-ring/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-3.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 justify-start bg-input text-input-foreground hover:bg-input/80 h-7 px-2 py-1 has-[>svg]:px-2 data-[empty=true]:text-muted-foreground tabular-nums max-w-32 w-fit flex-1 truncate border border-input"
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
						/>
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
							<div className="shrink-0 bg-border h-px -mx-4 my-4 w-auto" />
							<div className="flex w-full flex-col gap-2">{children}</div>
						</Popover.Popup>
					</Popover.Positioner>
				</Popover.Portal>
			</Popover.Root>
			{onClear && (
				<ClearButton hasValue={Boolean(hasValue)} handleClear={onClear} />
			)}
		</DesignAction>
	);
};
