import { Button } from "@base-ui/react/button";
import type { ReactNode } from "react";
import { Tooltip } from "./common/Tooltip";

export const DesignerToolbarButton = ({
	children,
	hint,
	onClick,
	isDisabled,
	isActive,
}: {
	children: ReactNode;
	hint: string;
	onClick: () => void;
	isDisabled?: boolean;
	/** A mode that's on, like commenting. */
	isActive?: boolean;
}) => {
	return (
		<Tooltip
			content={hint}
			triggerProps={{
				render: (
					<Button
						className="inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md text-control leading-none transition-[color,background-color,box-shadow,scale] focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[4px] focus-visible:ring-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 hover:bg-hover hover:text-hover-foreground dark:hover:bg-hover/50 h-7 px-2 py-1 has-[>svg]:px-2 font-normal data-[size=icon]:size-7 data-active:bg-selected data-active:text-foreground [&_svg:not([class*='size-'])]:size-4"
						data-size="icon"
						aria-label={hint}
						type="button"
						onClick={onClick}
						disabled={isDisabled}
						aria-invalid={isDisabled}
						aria-pressed={isActive}
						data-active={isActive || undefined}
					>
						{children}
					</Button>
				),
			}}
		/>
	);
};
