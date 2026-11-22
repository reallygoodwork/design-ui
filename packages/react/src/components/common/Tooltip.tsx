import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { ReactNode } from "react";

/**
 * The one tooltip style: a small dark chip beside the trigger. Without
 * `content`, renders the children alone.
 */
export const Tooltip = ({
	triggerProps,
	content,
	children,
}: {
	triggerProps?: React.ComponentProps<typeof BaseTooltip.Trigger>;
	content?: ReactNode;
	children?: ReactNode;
}) => {
	if (!content) {
		return <>{children}</>;
	}

	return (
		<BaseTooltip.Provider>
			<BaseTooltip.Root>
				<BaseTooltip.Trigger {...triggerProps}>{children}</BaseTooltip.Trigger>
				<BaseTooltip.Portal className="ds">
					<BaseTooltip.Positioner sideOffset={6} className="z-50">
						<BaseTooltip.Popup className="ds-tooltip ds-tooltip-chip">
							{content}
						</BaseTooltip.Popup>
					</BaseTooltip.Positioner>
				</BaseTooltip.Portal>
			</BaseTooltip.Root>
		</BaseTooltip.Provider>
	);
};
