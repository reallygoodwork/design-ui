import { Select as BaseSelect } from "@base-ui/react/select";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import { cn } from "../../lib/cn";
import { useRowLabel } from "./RowLabel";

interface SelectItem {
	label: string;
	value: string;
}

interface SelectProps {
	items: readonly SelectItem[];
	value: string;
	onValueChange: (value: string) => void;
	className?: string;
	/** A bare trigger that sits inside a field, with no chevron. */
	variant?: "default" | "suffix";
	ariaLabel?: string;
}

export const Select = ({
	items,
	value,
	onValueChange,
	className,
	variant = "default",
	ariaLabel,
}: SelectProps) => {
	const rowLabel = useRowLabel();
	const name =
		ariaLabel ??
		(rowLabel && (variant === "suffix" ? `${rowLabel} unit` : rowLabel));
	return (
		<BaseSelect.Root
			items={items}
			value={value}
			onValueChange={(newValue) => {
				onValueChange(newValue ?? "");
			}}
		>
			<BaseSelect.Trigger
				className={cn(
					`flex h-7 w-full items-center justify-end gap-1.5 whitespace-nowrap rounded-md border border-transparent bg-input px-2 py-1 font-mono text-value outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[placeholder]:text-muted-foreground *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2  dark:aria-invalid:ring-destructive/40 dark:hover:bg-input/50 [&_svg:not([class*='size-'])]:size-3 [&_svg:not([class*='text-'])]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0`,
					variant === "suffix" &&
						"mr-0.5 h-5 w-auto shrink-0 gap-0.5 border-0 bg-transparent px-1 text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
					className
				)}
				aria-label={name}
			>
				<BaseSelect.Value />
				<BaseSelect.Icon className="flex">
					<IconChevronDown
						className={variant === "suffix" ? "size-2.5 opacity-60" : undefined}
					/>
				</BaseSelect.Icon>
			</BaseSelect.Trigger>
			<BaseSelect.Portal className="ds">
				<BaseSelect.Positioner
					className="outline-none select-none z-10"
					sideOffset={4}
					alignItemWithTrigger={false}
					align={variant === "suffix" ? "end" : "center"}
				>
					<BaseSelect.Popup className="ds-popup ds-surface relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden data-[side=left]:-translate-x-1 data-[side=top]:-translate-y-1 data-[side=right]:translate-x-1 data-[side=bottom]:translate-y-1">
						<BaseSelect.List className="p-1 w-full min-w-[var(--anchor-width)] scroll-my-1">
							{items.map(({ label, value }) => (
								<BaseSelect.Item
									key={value}
									value={value}
									className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-2 pl-7 text-control outline-hidden focus:bg-hover focus:text-hover-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-3 [&_svg:not([class*='text-'])]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2"
								>
									<BaseSelect.ItemIndicator className="absolute left-2 flex size-3.5 items-center justify-center">
										<IconCheck className="size-3" />
									</BaseSelect.ItemIndicator>
									<BaseSelect.ItemText>{label}</BaseSelect.ItemText>
								</BaseSelect.Item>
							))}
						</BaseSelect.List>
					</BaseSelect.Popup>
				</BaseSelect.Positioner>
			</BaseSelect.Portal>
		</BaseSelect.Root>
	);
};
