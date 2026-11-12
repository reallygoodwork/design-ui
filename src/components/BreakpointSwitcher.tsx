import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { getPropertyValue, sortBreakpointsByWidth } from "@design-ui/core";
import { useDesignerAction } from "../hooks/useDesignerAction";
import { useDesignerSelector } from "../hooks/useDesignerSelector";
import { useSelectedLayers } from "../hooks/useSelectedLayers";
import { cn } from "../lib/cn";

/**
 * Shows and changes which breakpoint the styles below apply to. Pointing at a
 * control shows its value at every breakpoint: solid where it is set, muted
 * with an arrow where it is inherited from a smaller one.
 */
export const BreakpointSwitcher = ({
	property = null,
}: {
	property?: string | null;
}) => {
	const dispatch = useDesignerAction();
	const breakpoints = useDesignerSelector((state) => state.breakpoints);
	const activeId = useDesignerSelector((state) => state.activeBreakpointId);
	const [layer] = useSelectedLayers();

	if (breakpoints.length < 2) return null;

	return (
		<div className="sticky top-0 z-20 border-border border-b bg-background px-4 py-2">
			<ToggleGroup
				aria-label="Breakpoint to edit"
				value={activeId ? [activeId] : []}
				onValueChange={(next) => {
					if (next[0]) {
						dispatch({
							type: "SET_ACTIVE_BREAKPOINT",
							payload: { breakpointId: next[0] },
						});
					}
				}}
				className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-md bg-input p-1"
			>
				{sortBreakpointsByWidth(breakpoints).map((breakpoint) => {
					const info =
						layer && property
							? getPropertyValue(layer, breakpoint.id, property, breakpoints)
							: null;
					const hasOverrides = Boolean(
						layer?.breakpointCssVars?.[breakpoint.id]
					);
					return (
						<Toggle
							key={breakpoint.id}
							value={breakpoint.id}
							className="relative flex h-9 min-w-0 flex-col items-center justify-center rounded-sm px-1 text-caption leading-tight hover:bg-raised/50 data-pressed:bg-raised data-pressed:shadow-xs data-pressed:font-medium"
						>
							<span className="max-w-full truncate" title={breakpoint.name}>
								{breakpoint.name}
							</span>
							{hasOverrides && (
								<span
									aria-hidden="true"
									className="absolute top-0.5 right-0.5 size-1 rounded-full bg-accent"
								/>
							)}
							<span
								className={cn(
									"max-w-full truncate font-mono font-normal text-value",
									info?.isExplicit ? "text-foreground" : "text-muted-foreground"
								)}
							>
								{info
									? info.isExplicit || !info.value
										? (info.value ?? "\u2013")
										: `\u2191 ${info.value}`
									: `${breakpoint.width}`}
							</span>
						</Toggle>
					);
				})}
			</ToggleGroup>
		</div>
	);
};
