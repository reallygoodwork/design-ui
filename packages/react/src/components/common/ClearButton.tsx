import { Button } from "@base-ui/react/button";
import { IconX } from "@tabler/icons-react";
import { cn } from "../../lib/cn";

/** Clears a value. Revealed by hovering or focusing its row, or on touch. */
export const ClearButton = ({
	hasValue,
	handleClear,
	label = "Clear",
	className,
}: {
	hasValue: boolean;
	handleClear: () => void;
	label?: string;
	className?: string;
}) => (
	<Button
		disabled={!hasValue}
		onClick={handleClear}
		aria-label={label}
		title={label}
		className={cn(
			"relative inline-flex size-3.5 shrink-0 items-center justify-center rounded-sm after:absolute after:-inset-[5px] after:content-[''] text-muted-foreground opacity-0 transition-[opacity,scale] duration-100 hover:bg-foreground/10 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-1 focus-visible:outline-ring active:scale-[0.96] group-focus-within/action:opacity-100 group-hover/action:opacity-100 pointer-coarse:opacity-100 disabled:invisible [&_svg]:pointer-events-none [&_svg]:size-2.5",
			className
		)}
	>
		<IconX />
	</Button>
);
