import { NumberField } from "@base-ui/react/number-field";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ClearButton } from "../common/ClearButton";
import { DesignAction } from "../DesignAction";

interface NumberFieldActionControlProps {
	label: string;
	defaultValue?: number;
	min?: number;
	max?: number;
	step?: number;
	orientation?: "horizontal" | "vertical";
	addon?: ReactNode;
	value?: number;
	onValueChange?: (value: number | null) => void;
	hasValue?: boolean;
	onClear?: () => void;
}

export const NumberFieldActionControl = ({
	label,
	defaultValue = 0,
	min,
	max,
	step = 1,
	orientation = "vertical",
	addon = "",
	value,
	onValueChange,
	hasValue: externalHasValue,
	onClear: externalOnClear,
}: NumberFieldActionControlProps) => {
	const selectedLayers = useSelectedLayers();
	const designerAction = useDesignerAction();
	const selectedLayer = selectedLayers[0];

	// Determine if controlled or uncontrolled
	const isControlled = value !== undefined && onValueChange !== undefined;

	const handleValueChange = (newValue: number | null) => {
		if (isControlled && onValueChange) {
			onValueChange(newValue);
		}
	};

	const handleClear = () => {
		if (externalOnClear) {
			externalOnClear();
		}
	};

	const hasValue = externalHasValue ?? false;
	const currentValue = value ?? defaultValue;

	return (
		<DesignAction label={label} orientation={orientation}>
			<NumberField.Root
				value={currentValue}
				onValueChange={handleValueChange}
				min={min}
				max={max}
				step={step}
				className="flex items-center gap-1"
			>
				<NumberField.Group className="inline-flex items-center gap-1 whitespace-nowrap rounded-md font-medium text-xs leading-none transition-all focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[4px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-3.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 bg-input text-input-foreground hover:bg-input/80 h-7 px-2 py-1 has-[>svg]:px-2 border border-input">
					<NumberField.Decrement className="flex items-center justify-center p-0 size-3.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:hover:text-muted-foreground">
						<IconMinus />
					</NumberField.Decrement>
					<NumberField.Input className="w-12 bg-transparent text-center text-foreground text-xs tabular-nums outline-hidden placeholder:text-muted-foreground" />
					<NumberField.Increment className="flex items-center justify-center p-0 size-3.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:hover:text-muted-foreground">
						<IconPlus />
					</NumberField.Increment>
				</NumberField.Group>
			</NumberField.Root>
			{externalOnClear && <ClearButton hasValue={hasValue} handleClear={handleClear} />}
		</DesignAction>
	);
};
