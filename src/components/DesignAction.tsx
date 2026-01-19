import { Fieldset } from "@base-ui/react/fieldset";
import type { ReactNode } from "react";

export const DesignAction = ({ children, label = "Action", orientation = "horizontal" }: { children: ReactNode, label?: string, orientation?: "horizontal" | "vertical" }) => {
	return (
		<Fieldset.Root data-orientation={orientation} data-slot="action" className="group/action [&_[data-slot=popover-anchor]]:-mr-4 relative flex min-w-0 items-start justify-between gap-2 data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch data-[orientation=vertical]:gap-2 [&_[data-slot=popover-anchor]]:absolute [&_[data-slot=popover-anchor]]:top-0 [&_[data-slot=popover-anchor]]:left-0">
			<Fieldset.Legend className="select-none gap-2 font-medium text-muted-foreground text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 line-clamp-1 flex h-7 w-18 group-data-[orientation=vertical]/action:w-full group-data-[orientation=vertical]/action:h-4 items-center transition-colors group-focus-within/action:text-primary group-has-[[data-state=open]]/action:text-foreground shrink-0">
				{label}
			</Fieldset.Legend>
      <div data-slot="action-controls" className="flex flex-1 justify-end gap-1 group-data-[orientation=vertical]/action:justify-start items-center">
        {children}
      </div>
		</Fieldset.Root>
	);
};