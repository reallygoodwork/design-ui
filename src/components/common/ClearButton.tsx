import { Button } from "@base-ui/react/button";
import { IconX } from "@tabler/icons-react";

export const ClearButton = ({
	hasValue,
	handleClear,
}: {
	hasValue: boolean;
	handleClear: () => void;
}) => {
	return (
		<Button
			disabled={!hasValue}
			onClick={handleClear}
			className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-sm font-medium text-xs leading-none transition-all focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[4px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 bg-input text-input-foreground hover:bg-input/80 size-5 justify-center p-0 active:scale-95 [&_svg:not([class*='size-'])]:size-3"
		>
			<IconX />
		</Button>
	);
};
