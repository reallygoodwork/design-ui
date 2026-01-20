import { ScrollArea } from "@base-ui/react/scroll-area";
import { Tabs as BaseTabs, type TabsRootProps } from "@base-ui/react/tabs";
import type { CSSProperties } from "react";

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
			style={
				{
					"--tabs-list-height": "30px",
				} as CSSProperties
			}
			{...props}
		>
			<div className="px-2 pt-2 flex flex-col">
				<BaseTabs.List className="inline-flex h-(--tabs-list-height) items-center justify-center rounded-md bg-muted p-[3px] text-muted-foreground w-full relative">
					{items.map((item) => (
						<BaseTabs.Tab
							key={item.value}
							value={item.value}
							className="inline-flex h-6 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-sm border border-transparent px-2 py-1 font-medium text-foreground text-xs transition-[color,box-shadow] focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-active:bg-background data-active:shadow-sm dark:text-muted-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0"
						>
							{item.label}
						</BaseTabs.Tab>
					))}

					<BaseTabs.Indicator className="absolute top-1/2 left-0 z-[-1] h-6 w-(--active-tab-width) translate-x-(--active-tab-left) -translate-y-1/2 rounded-sm bg-gray-100 transition-all duration-200 ease-in-out" />
				</BaseTabs.List>
			</div>
			{items.map((item) => (
				<BaseTabs.Panel
					key={item.value}
					value={item.value}
					className="flex-1 shrink-0"
				>
					<ScrollArea.Root className="h-[calc(100vh-var(--designer-panel-height)-var(--tabs-list-height)-24px)] w-full">
						<ScrollArea.Viewport className="h-full">
							{item.content}
						</ScrollArea.Viewport>
						<ScrollArea.Scrollbar className="m-1 flex w-1 justify-center rounded bg-input opacity-0 transition-opacity pointer-events-none data-hovering:opacity-100 data-hovering:delay-0 data-hovering:pointer-events-auto data-scrolling:opacity-100 data-scrolling:duration-0 data-scrolling:pointer-events-auto">
							<ScrollArea.Thumb className="w-full rounded bg-border" />
						</ScrollArea.Scrollbar>
					</ScrollArea.Root>
				</BaseTabs.Panel>
			))}
		</BaseTabs.Root>
	);
};
