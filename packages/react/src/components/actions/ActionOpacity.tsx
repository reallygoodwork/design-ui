import { useBreakpointCss } from "../../hooks/useBreakpointCss";
import { InputGroup } from "../common/InputGroup";
import { Tooltip } from "../common/Tooltip";
import { DesignAction } from "../DesignAction";
import { TokenSlot } from "../tokens/TokenSlot";

const CSS_PROPERTY = "--opacity";
const DEFAULT_PERCENT = 100;

/**
 * Read a stored opacity as a 0-100 percentage. CSS opacity is 0-1, so values
 * up to 1 are scaled. Values above 1 (written as raw 0-100 numbers by older
 * versions of this control) and "50%" strings are already percentages.
 * Ambiguity: a legacy "1" (meant 1%) is indistinguishable from a new-format
 * 1 (100%); we read it as 100%.
 */
const toPercent = (stored: string | undefined): number => {
	if (!stored) return DEFAULT_PERCENT;
	const n = parseFloat(stored);
	if (Number.isNaN(n)) return DEFAULT_PERCENT;
	const percent = stored.trim().endsWith("%") || n > 1 ? n : n * 100;
	return Math.min(100, Math.max(0, Math.round(percent)));
};

/** Convert a 0-100 percentage to a CSS opacity (0-1) string. */
const toCssOpacity = (percent: number): string =>
	String(Math.min(100, Math.max(0, Math.round(percent))) / 100);

export const ActionOpacity = () => {
	const {
		value,
		isExplicit,
		fromBreakpointName,
		isPrimary,
		setValue,
		clearValue,
	} = useBreakpointCss(CSS_PROPERTY);
	const percent = toPercent(value);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const text = e.target.value.trim();
		if (text === "") return clearValue();
		const n = Number(text);
		if (!Number.isNaN(n)) setValue(toCssOpacity(n));
	};

	// Same convention as NumericActionControl: inherited values show as a
	// placeholder with a tooltip, explicit overrides get a label marker.
	const inheritanceTooltip =
		!isPrimary && fromBreakpointName
			? isExplicit
				? `Overrides ${fromBreakpointName}`
				: `Inherited from ${fromBreakpointName}`
			: undefined;
	const label = !isPrimary && isExplicit ? "Opacity \u2022" : "Opacity";

	return (
		<DesignAction
			clear={{ hasValue: isExplicit, onClear: clearValue }}
			label={label}
			orientation="horizontal"
			property={CSS_PROPERTY}
		>
			<TokenSlot
				title="Opacity"
				inherited={!isExplicit}
				binding={{
					type: "number",
					cssProperty: CSS_PROPERTY,
					value,
					onChange: setValue,
				}}
			>
				<div className="flex min-w-0 flex-1 items-center gap-1">
					<Tooltip
						content={inheritanceTooltip}
						triggerProps={{ render: <div /> }}
					>
						<div className="flex-1">
							<InputGroup
								fullWidth
								value={isExplicit || isPrimary ? String(percent) : ""}
								placeholder={String(percent)}
								inherited={!isPrimary && !isExplicit && Boolean(value)}
								onChange={handleInputChange}
								suffix={
									<span className="shrink-0 pr-2 font-mono text-muted-foreground text-value">
										%
									</span>
								}
								scrub={{
									value: percent,
									min: 0,
									max: 100,
									onChange: (next) => setValue(toCssOpacity(next)),
								}}
							/>
						</div>
					</Tooltip>
				</div>
			</TokenSlot>
		</DesignAction>
	);
};
