import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Tooltip } from "@base-ui/react/tooltip";
import type { ReactNode } from "react";
import { usePropertyAccess } from "../../hooks/useAllowed";
import { useBreakpointCss } from "../../hooks/useBreakpointCss";
import { cn } from "../../lib/cn";
import { DesignAction } from "../DesignAction";

interface ToggleItem {
	label: string;
	value: string;
	icon?: ReactNode;
}

interface ToggleGroupControlProps {
	cssProperty: string;
	label: string;
	options: readonly ToggleItem[];
	defaultValue?: string;
	orientation?: "horizontal" | "vertical";
}

export const ToggleGroupControl = ({
	cssProperty,
	label,
	options,
	defaultValue = "",
	orientation = "horizontal",
}: ToggleGroupControlProps) => {
	// A fixed list from the editing rules leaves only those options.
	const { oneOf } = usePropertyAccess(cssProperty);
	if (oneOf) options = options.filter((o) => oneOf.includes(o.value));
	const { value, isExplicit, isOverride, setValue, clearValue } =
		useBreakpointCss(cssProperty);
	const currentValue = value || defaultValue;
	// Showing a value from a smaller breakpoint, not one set here
	const isInherited = !isExplicit && Boolean(value);

	return (
		<DesignAction
			clear={{ hasValue: isExplicit, onClear: clearValue }}
			label={isOverride ? `${label} \u2022` : label}
			orientation={orientation}
			property={cssProperty}
		>
			<ToggleGroup
				multiple={false}
				value={[currentValue]}
				onValueChange={(next) => setValue(next.join(" "))}
				className="flex h-7 min-w-0 flex-1 items-center justify-end gap-0.5 rounded-md bg-input p-1"
			>
				{options.map((option) => (
					<Tooltip.Root key={option.value}>
						<Tooltip.Trigger
							render={(props) => (
								<Toggle
									{...props}
									value={option.value}
									aria-label={
										isInherited && option.value === currentValue
											? `${option.label} (inherited)`
											: option.label
									}
									className={cn(
										"flex h-full min-w-6 shrink-0 items-center justify-center rounded-sm px-1 text-control hover:bg-raised/50 data-pressed:bg-raised data-pressed:text-foreground data-pressed:shadow-xs [&_svg:not([class*='size-'])]:size-3.5",
										isInherited &&
											"data-pressed:text-muted-foreground data-pressed:outline-1 data-pressed:outline-dashed data-pressed:outline-foreground/40 data-pressed:-outline-offset-1"
									)}
								>
									{option.icon ? option.icon : option.label}
								</Toggle>
							)}
						/>
						<Tooltip.Portal className="ds">
							<Tooltip.Positioner sideOffset={6}>
								<Tooltip.Popup className="ds-tooltip ds-tooltip-chip">
									{option.label}
								</Tooltip.Popup>
							</Tooltip.Positioner>
						</Tooltip.Portal>
					</Tooltip.Root>
				))}
			</ToggleGroup>
		</DesignAction>
	);
};
