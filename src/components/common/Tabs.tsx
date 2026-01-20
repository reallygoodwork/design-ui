import { Tabs as BaseTabs, type TabsRootProps } from "@base-ui/react/tabs";
import { cn } from "../../lib/cn";

interface TabsItem {
	label: string;
	value: string;
	content: React.ReactNode;
}

interface BaseTabsProps extends TabsRootProps {
	items: TabsItem[];
}

export const Tabs = ({
	items,
	value,
	defaultValue,
	onValueChange,
	orientation = "horizontal",
	className = "",
	...props
}: BaseTabsProps) => {
	return (
		<BaseTabs.Root
			defaultValue={defaultValue}
			onValueChange={onValueChange}
			orientation={orientation}
			className={className}
			{...props}
		>
			<div className="px-2 pt-2">
				<BaseTabs.List className="inline-flex h-[30px] items-center justify-center rounded-md bg-muted p-[3px] text-muted-foreground w-full relative">
					{items.map((item) => (
						<BaseTabs.Tab
							key={item.value}
							value={item.value}
							className="inline-flex h-6 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-sm border border-transparent px-2 py-1 font-medium text-foreground text-xs transition-[color,box-shadow] focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-active:bg-background data-active:shadow-sm dark:text-muted-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0"
						>
							{item.label}
						</BaseTabs.Tab>
					))}

					<BaseTabs.Indicator className="absolute top-1/2 left-0 z-[-1] h-6 w-[var(--active-tab-width)] translate-x-[var(--active-tab-left)] -translate-y-1/2 rounded-sm bg-gray-100 transition-all duration-200 ease-in-out" />
				</BaseTabs.List>
			</div>
			{items.map((item) => (
				<BaseTabs.Panel key={item.value} value={item.value} className="">
					{item.content}
				</BaseTabs.Panel>
			))}
		</BaseTabs.Root>
	);
};
