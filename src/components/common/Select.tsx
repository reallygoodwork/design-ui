import { Select as BaseSelect } from "@base-ui/react/select";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import { cn } from "../../lib/cn";

interface SelectItem {
	label: string;
	value: string;
}

interface SelectProps {
	items: readonly SelectItem[];
	value: string;
	onValueChange: (value: string) => void;
	className?: string;
}

export const Select = ({ items, value, onValueChange, className }: SelectProps) => {
	return (
		<BaseSelect.Root
			items={items}
			value={value}
			onValueChange={(newValue) => {
				onValueChange(newValue ?? "");
			}}
		>
			<BaseSelect.Trigger
				className={cn(`flex h-7 w-full items-center justify-between gap-1.5 whitespace-nowrap rounded-md border border-transparent bg-input px-2 py-1 text-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[placeholder]:text-muted-foreground *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2  dark:aria-invalid:ring-destructive/40 dark:hover:bg-input/50 [&_svg:not([class*='size-'])]:size-3 [&_svg:not([class*='text-'])]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0`, className)}
			>
				<BaseSelect.Value />
				<BaseSelect.Icon className="flex">
					<IconChevronDown />
				</BaseSelect.Icon>
			</BaseSelect.Trigger>
			<BaseSelect.Portal>
				<BaseSelect.Positioner className="outline-none select-none z-10" sideOffset={8}>
					<BaseSelect.Popup className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--transform-origin) overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md duration-100 data-[state=closed]:animate-out data-[state=open]:animate-in data-[side=left]:-translate-x-1 data-[side=top]:-translate-y-1 data-[side=right]:translate-x-1 data-[side=bottom]:translate-y-1">
						<BaseSelect.List className="p-1 w-full min-w-[var(--anchor-width)] scroll-my-1">
							{items.map(({ label, value }) => (
								<BaseSelect.Item
									key={value}
									value={value}
									className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-2 pl-7 text-xs outline-hidden focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-3 [&_svg:not([class*='text-'])]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2"
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
