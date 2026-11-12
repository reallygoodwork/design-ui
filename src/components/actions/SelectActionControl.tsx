import { useBreakpointCss } from "../../hooks/useBreakpointCss";
import type { TokenType } from "../../lib/tokens";
import { Select } from "../common/Select";
import { DesignAction } from "../DesignAction";
import { TokenSlot } from "../tokens/TokenSlot";

interface SelectItem {
	label: string;
	value: string;
}

interface SelectActionControlProps {
	cssProperty: string;
	label: string;
	options: readonly SelectItem[];
	defaultValue?: string;
	orientation?: "horizontal" | "vertical";
	/** Lets the value be a token of this type, like font weight. */
	tokenType?: TokenType;
}

export const SelectActionControl = ({
	cssProperty,
	label,
	options,
	defaultValue = "",
	orientation = "horizontal",
	tokenType,
}: SelectActionControlProps) => {
	const { value, isExplicit, isOverride, setValue, clearValue } =
		useBreakpointCss(cssProperty);
	const currentValue = value || defaultValue;

	return (
		<DesignAction
			clear={{ hasValue: isExplicit, onClear: clearValue }}
			label={isOverride ? `${label} \u2022` : label}
			orientation={orientation}
			property={cssProperty}
		>
			{tokenType ? (
				<TokenSlot
					title={label}
					inherited={!isExplicit}
					binding={{ type: tokenType, cssProperty, value, onChange: setValue }}
				>
					<Select
						items={options}
						value={currentValue}
						onValueChange={setValue}
					/>
				</TokenSlot>
			) : (
				<Select items={options} value={currentValue} onValueChange={setValue} />
			)}
		</DesignAction>
	);
};
